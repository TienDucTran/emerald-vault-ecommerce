// AI Chatbot route (flows.md §15.7) — VIP upgrade
import { streamText, stepCountIs, type UIMessage } from 'ai';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { waitUntil } from '@vercel/functions';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth/require-customer';
import {
  getChatModelChain,
  setActiveProvider,
  markProviderRateLimited,
  getCooldownInfo,
  getStreamOptions,
} from '@/lib/chatbot/client';
import { buildSystemPrompt } from '@/lib/chatbot/system-prompt';
import { allTools } from '@/lib/chatbot/tools';
import {
  setChatContext,
  clearChatContext,
  runWithChatContext,
} from '@/lib/chatbot/tools';
import { getChatConfig } from '@/lib/chatbot/config';
import { rateLimit } from '@/lib/middleware';
import { redactPII } from '@/lib/log/redact';
// VIP upgrade imports
import { classifyIntent, generateEscalationMessage } from '@/lib/chatbot/intent-router';
import { fetchUserContext, formatUserContext } from '@/lib/chatbot/user-context';
import { getConversationSummary } from '@/lib/chatbot/conversation-memory';
import { detectSentiment, generateEmpathyPrefix, type SentimentResult } from '@/lib/chatbot/sentiment';
import { polishResponse } from '@/lib/chatbot/stream-processor';
import { SHOP_INFO } from '@/lib/chatbot/static-knowledge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 25;

const COOKIE_NAME = 'ev_client_id';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CONTENT_LENGTH_LIMIT = 256 * 1024;
const isProd = process.env.NODE_ENV === 'production';
const devLog = (...args: unknown[]) => { if (!isProd) console.log(...args); };
const devWarn = (...args: unknown[]) => { if (!isProd) console.warn(...args); };

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_SITE_URL || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function POST(request: NextRequest) {
  return await runWithChatContext(
    { sessionId: 'pending', userId: null, provider: 'none', model: 'none' },
    async () => await handleChatPost(request)
  );
}

async function handleChatPost(request: NextRequest): Promise<Response> {
  try {
    // 0) Rate-limit
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
    const limit = await rateLimit('chat', { identifier: ip, limit: 20, window: '1 m' });
    if (!limit.ok) {
      return Response.json(
        { error: 'RATE_LIMITED', retryAfter: limit.retryAfter, userMessage: 'Em nhan qua roi, cho mot chut roi hoi tiep nhe!', retryable: true },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter ?? 60) } }
      );
    }

    // 0b) Payload size guard
    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > CONTENT_LENGTH_LIMIT) {
      return Response.json({ error: 'PAYLOAD_TOO_LARGE', userMessage: 'Tin nhan qua lon, em vui long rut gon roi gui lai nhe!', retryable: false }, { status: 413 });
    }

    const supabaseAdmin = createAdminClient();
    const chatCfg = getChatConfig();

    // 1) Parse body
    let body: { messages?: UIMessage[]; sessionId?: string };
    try { body = await request.json(); } catch {
      return Response.json({ error: 'INVALID_JSON', userMessage: 'Tin nhan bi loi dinh dang, em thu gui lai nhe!', retryable: false }, { status: 400 });
    }
    const { messages = [] } = body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: 'NO_MESSAGES', userMessage: 'Em chua nhap tin nhan nao, em hoi Ba Chu die gi di nao!', retryable: false }, { status: 400 });
    }
    if (messages.length > 50) {
      return Response.json({ error: 'TOO_MANY_MESSAGES', userMessage: 'Cuoc tro chuyen da qua dai roi, em hay bat dau cuoc moi nhe!', retryable: false }, { status: 400 });
    }

    // 2) Cookie clientId
    const cookieStore = await cookies();
    let clientId = cookieStore.get(COOKIE_NAME)?.value;
    if (!clientId || !UUID_V4_REGEX.test(clientId)) {
      clientId = crypto.randomUUID();
      cookieStore.set(COOKIE_NAME, clientId, { sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: COOKIE_MAX_AGE });
    }

    // 3) User (optional)
    const currentUser = await getCurrentUser();
    const userId = currentUser?.user?.id ?? null;

    // 4) Upsert session
    const { data: session, error: sessErr } = await supabaseAdmin.rpc('upsert_chat_session', { p_client_id: clientId, p_user_id: userId });
    if (sessErr || !session) {
      console.error('[api/chat] session upsert failed:', redactPII(sessErr?.message ?? 'no session'));
      return Response.json({ error: 'SESSION_FAILED', userMessage: 'Ba Chu gap chut truc trac, em thu lai sau it phut nhe!', retryable: true }, { status: 500 });
    }
    const sessionId = (session as { id: string }).id;

    setChatContext({ sessionId, userId, provider: 'pending', model: 'pending' });

    // 5) Save latest user message + VIP Phase 2 (Intent Routing) + Phase 5 (Sentiment)
    const lastUserMsg = messages[messages.length - 1];
    // VIP: declare sentiment outside if-block for scope access in escalation context
    let sentiment: SentimentResult | null = null;
    if (lastUserMsg && (lastUserMsg as { role?: string }).role === 'user') {
      const rawContent = (lastUserMsg as { content?: unknown }).content;
      const content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
      if (content.length > 2000) {
        return Response.json({ error: 'MESSAGE_TOO_LONG', userMessage: 'Tin nhan qua dai (toi da 2000 ky tu). Em hay rut gon nhe!', retryable: false }, { status: 400 });
      }
      const { error: insertErr } = await supabaseAdmin.from('chat_messages').insert({ session_id: sessionId, role: 'user', content });
      if (insertErr) console.error('[api/chat] save user msg failed:', redactPII(insertErr.message));

      // VIP Phase 2: Intent Routing
      const intent = classifyIntent(content);
      devLog(`[api/chat] intent: ${intent.type} (confidence=${intent.confidence})`);

      // VIP Phase 5: Sentiment Detection
      sentiment = detectSentiment(content);
      if (sentiment.type !== 'neutral' && sentiment.type !== 'positive') {
        devLog(`[api/chat] sentiment: ${sentiment.type} (score=${sentiment.score})`);
      }

      // VIP Phase 2: Shortcut response (bypass LLM)
      if (intent.shortcutResponse && intent.confidence >= 0.85) {
        let shortcutText = intent.shortcutResponse;
        if (sentiment.type === 'negative' || sentiment.type === 'frustrated') {
          shortcutText = generateEmpathyPrefix(sentiment) + shortcutText;
        }
        shortcutText = polishResponse(shortcutText);

        if (intent.shouldCallLeadCapture && (intent.detectedPhone || intent.detectedEmail)) {
          waitUntil((async () => {
            try {
              await supabaseAdmin.from('chat_leads').insert({
                session_id: sessionId, user_id: userId,
                contact_type: intent.detectedPhone ? 'phone' : 'email',
                contact_value: intent.detectedPhone || intent.detectedEmail,
                intent: `shortcut_${intent.type}`,
              });
            } catch (e) { console.error('[api/chat] shortcut lead failed:', redactPII(e instanceof Error ? e.message : 'unknown')); }
          })());
        }

        const { error: shortcutErr } = await supabaseAdmin.from('chat_messages').insert({ session_id: sessionId, role: 'assistant', content: shortcutText });
        if (shortcutErr) console.error('[api/chat] save shortcut msg failed:', redactPII(shortcutErr.message));

        devLog(`[api/chat] shortcut response sent (intent=${intent.type}), bypassing LLM`);
        const encoder = new TextEncoder();
        const stream = new ReadableStream({ start(controller) { controller.enqueue(encoder.encode(shortcutText)); controller.close(); } });
        return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }

      // VIP Phase 5: Auto-escalation for complaints
      if (intent.type === 'complaint' || sentiment.shouldEscalate) {
        const zaloLink = `https://zalo.me/${SHOP_INFO.contact.zalo}`;
        const escalationMsg = generateEscalationMessage(intent, zaloLink);
        if (escalationMsg) devLog('[api/chat] complaint/frustration detected - will inject escalation context');
      }
    }

    // Update last_message_at
    await supabaseAdmin.from('chat_sessions').update({ last_message_at: new Date().toISOString() }).eq('id', sessionId);

    // 6) Configured?
    if (!chatCfg.isConfigured) {
      const fakeText = 'Xin loi, chatbot hien chua duoc cau hinh. Vui long lien he admin qua muc Lien he.';
      await supabaseAdmin.from('chat_messages').insert({ session_id: sessionId, role: 'assistant', content: fakeText });
      const encoder = new TextEncoder();
      const stream = new ReadableStream({ start(controller) { controller.enqueue(encoder.encode(fakeText)); controller.close(); } });
      return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }

    type ChatRow = { role: string; content: string };

    const TOOL_CALL_BUG_RE = /parameters.*did not match|Invalid input for tool|tool_call.*failed|tool use.*validation/i;
    const TOOL_CALL_LEAK_RE = /function\s*=\s*\w+\s*>\s*[\{<]/i;
    const FUNCTION_TAG_RE = /<\/?function\s*>/i;
    const STREAM_TIMEOUT_MS = Number(process.env.CHAT_STREAM_TIMEOUT_MS) || 25_000;
    const RATE_LIMIT_RE = /rate limit|429|tokens per minute|\btpm\b|quota|too many requests|try again in/i;

    // 7) Sliding window - VIP: 6 messages (3 turns) thay vi 2
    const isFirstTurn = messages.length === 1;
    let orderedHistory: ChatRow[] = [];
    if (isFirstTurn) {
      orderedHistory = messages.map((m: any) => ({
        role: (m.role as string) ?? 'user',
        content: typeof m.content === 'string' ? m.content : Array.isArray(m.content) ? m.content.filter((p: any) => p?.type === 'text' && typeof p.text === 'string').map((p: any) => p.text).join('\n') : typeof m.parts === 'string' ? m.parts : '',
      })) as ChatRow[];
      devLog(`[api/chat] first turn - using client messages directly (${orderedHistory.length})`);
    } else {
      const { data: history, error: histErr } = await supabaseAdmin
        .from('chat_messages').select('role, content').eq('session_id', sessionId)
        .order('created_at', { ascending: false }).limit(6);
      if (histErr) console.error('[api/chat] load history failed:', redactPII(histErr.message));
      orderedHistory = ((history ?? []) as ChatRow[]).reverse();
      devLog(`[api/chat] multi-turn - loaded ${orderedHistory.length} from DB (limit=6, VIP window)`);
    }

    const extractText = (raw: string): string => {
      if (!raw) return '';
      const trimmed = raw.trim();
      if (trimmed.length < 100) return raw;
      if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) return raw;
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          const textParts = parsed.filter((p: any) => p && p.type === 'text' && typeof p.text === 'string').map((p: any) => p.text).join('\n');
          if (textParts) return textParts;
        }
        if (parsed && typeof parsed === 'object' && typeof parsed.text === 'string') return parsed.text;
      } catch { /* not JSON */ }
      return raw;
    };

    function isCrossLanguageLeak(text: string): boolean {
      if (!text || text.length < 10) return false;
      const cjkCount = (text.match(/[\u4E00-\u9FFF]/g) || []).length;
      const jpCount = (text.match(/[\u3040-\u30FF]/g) || []).length;
      return (cjkCount + jpCount) / text.length > 0.3;
    }

    const orderedFiltered = orderedHistory.filter((m) => {
      const text = extractText(m.content).trim();
      if (!text) return false;
      if (isCrossLanguageLeak(text)) { devWarn(`[api/chat] dropping cross-language leak (role=${m.role})`); return false; }
      if (TOOL_CALL_LEAK_RE.test(text) || FUNCTION_TAG_RE.test(text)) { devWarn(`[api/chat] skipping tool-call leak (role=${m.role})`); return false; }
      return m.role === 'user' || m.role === 'assistant' || m.role === 'system';
    });

    // Dedupe assistant messages
    const deduped: ChatRow[] = [];
    for (const m of orderedFiltered) {
      if (m.role === 'assistant' && deduped.length > 0) {
        const prev = deduped[deduped.length - 1];
        if (prev.role === 'assistant') {
          const prevText = extractText(prev.content);
          const curText = extractText(m.content);
          if (curText && prevText) {
            const shorter = curText.length < prevText.length ? curText : prevText;
            const longer = curText.length < prevText.length ? prevText : curText;
            if (shorter.length > 50 && longer.includes(shorter)) { devWarn('[api/chat] dedupe: skipping duplicate'); continue; }
          }
        }
      }
      deduped.push(m);
    }
    const finalMessages = deduped;

    const modelMessages = finalMessages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: [{ type: 'text' as const, text: extractText(m.content) }],
    }));
    devLog(`[api/chat] modelMessages count: ${modelMessages.length} (filtered from ${orderedHistory.length})`);

    // VIP Phase 1+3+4: Build dynamic system prompt with user context + conversation summary
    const [userContext, conversationSummary] = await Promise.all([
      fetchUserContext(userId),
      getConversationSummary(sessionId, orderedHistory.length),
    ]);
    const userContextStr = formatUserContext(userContext);
    if (userContextStr) devLog('[api/chat] user context injected');
    if (conversationSummary) devLog('[api/chat] conversation summary injected');

    const dynamicContextParts: string[] = [];
    if (userContextStr) dynamicContextParts.push(userContextStr);
    if (conversationSummary) dynamicContextParts.push(conversationSummary);

    // VIP Phase 5: Inject escalation context if complaint/frustration
    if (sentiment && sentiment.shouldEscalate) {
      const zaloLink = `https://zalo.me/${SHOP_INFO.contact.zalo}`;
      dynamicContextParts.push(
        `LUU Y: Khach dang ${sentiment.type === 'frustrated' ? 'rat kho chiu' : 'khong hai long'}. ` +
        `Phan hoi voi su thau hieu, xin loi chan thanh, va goi y lien he Zalo ${zaloLink} de xu ly truc tiep.`
      );
    }

    const fullSystemPrompt = buildSystemPrompt(
      dynamicContextParts.length > 0 ? dynamicContextParts.join('\n\n') : undefined
    );
    const streamOpts = getStreamOptions();

    // 8) Stream
    const chain = getChatModelChain();
    if (chain.length === 0) {
      const cooldowns = await getCooldownInfo();
      const cfg = chatCfg;
      const missingKeys = [
        !cfg.groqKey && 'GROQ_API_KEY', !cfg.openrouterKey && 'OPENROUTER_API_KEY',
        !cfg.cerebrasKey && 'CEREBRAS_API_KEY', (!cfg.cloudflareKey || !cfg.cloudflareAccountId) && 'CLOUDFLARE_API_KEY/CLOUDFLARE_ACCOUNT_ID',
        !cfg.geminiKey && 'GOOGLE_AI_API_KEY', !cfg.openaiKey && 'OPENAI_API_KEY',
      ].filter(Boolean);
      const hasCooldowns = Object.keys(cooldowns).length > 0;
      console.error('[api/chat] No providers available.', { missingKeys, cooldowns });
      return Response.json({
        error: hasCooldowns ? 'ALL_PROVIDERS_COOLDOWN' : 'NO_PROVIDER',
        message: hasCooldowns ? 'Tat ca AI provider dang trong thoi gian cho rate limit.' : `Chua cau hinh AI provider. Thieu env: ${missingKeys.join(', ')}.`,
        userMessage: hasCooldowns ? 'Ba Chu dang ban mot chut xiu, em cho khoang 30 giay roi hoi lai nhe!' : 'Ba Chu dang ban chut, em quay lai sau nha.',
        retryable: hasCooldowns,
        retryAfterSeconds: hasCooldowns ? Math.max(...Object.values(cooldowns).map(ms => Math.ceil(ms / 1000))) : 60,
        missingKeys: hasCooldowns ? undefined : missingKeys,
        cooldowns: hasCooldowns ? cooldowns : undefined,
      }, { status: 503 });
    }

    const tried: string[] = [];
    const failedReasons: { provider: string; reason: string }[] = [];
    let result: any = null;
    let successProvider: string | null = null;
    let lastStreamErrorMsg: string | null = null;

    for (const entry of chain) {
      tried.push(`${entry.provider}/${entry.modelName}`);
      lastStreamErrorMsg = null;
      devLog(`[api/chat] Trying ${entry.provider}/${entry.modelName}...`);
      try {
        setChatContext({ sessionId, userId, provider: entry.provider, model: entry.modelName });

        const providerAbort = new AbortController();
        const chainAbort = () => providerAbort.abort();
        if (request.signal.aborted) { providerAbort.abort(); }
        else { request.signal.addEventListener('abort', chainAbort, { once: true }); }

        const candidate = streamText({
          model: entry.instance as unknown as Parameters<typeof streamText>[0]['model'],
          system: fullSystemPrompt,
          messages: modelMessages as any,
          tools: allTools,
          stopWhen: stepCountIs(6), // VIP: 6 thay vi 4
          temperature: streamOpts.temperature,
          maxOutputTokens: streamOpts.maxTokens,
          stopSequences: streamOpts.stopSequences,
          abortSignal: providerAbort.signal,
          onFinish: ({ text, usage }) => {
            waitUntil((async () => {
              try {
                // VIP Phase 6: Polish response before saving
                const polishedText = polishResponse(text);
                await supabaseAdmin.from('chat_messages').insert({ session_id: sessionId, role: 'assistant', content: polishedText, tokens_used: usage?.totalTokens ?? null });
                await supabaseAdmin.from('chat_sessions').update({ last_message_at: new Date().toISOString() }).eq('id', sessionId);
              } catch (e) { console.error('[api/chat] persist assistant msg failed:', redactPII(e instanceof Error ? e.message : 'unknown')); }
            })());
          },
          onError: ({ error }: { error: { message?: string } | Error | unknown }) => {
            const errMsg = error && typeof error === 'object' && 'message' in error ? (error as { message?: string }).message : String(error);
            lastStreamErrorMsg = errMsg ?? null;
            console.error(`[api/chat] streamText error (${entry.provider}/${entry.modelName}):`, redactPII(errMsg ?? ''));
          },
        });

        let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
        try {
          await Promise.race([
            candidate.consumeStream(),
            new Promise<never>((_, reject) => { timeoutHandle = setTimeout(() => { providerAbort.abort(); reject(new Error('STREAM_TIMEOUT')); }, STREAM_TIMEOUT_MS); }),
          ]);
        } finally {
          if (timeoutHandle) clearTimeout(timeoutHandle);
          providerAbort.abort();
          request.signal.removeEventListener('abort', chainAbort);
        }

        const fullText = await candidate.text;
        if (TOOL_CALL_LEAK_RE.test(fullText) || FUNCTION_TAG_RE.test(fullText)) {
          throw new Error('TOOL_CALL_LEAK: model generated raw tool call text instead of API call');
        }
        if (isCrossLanguageLeak(fullText)) {
          throw new Error('CROSS_LANGUAGE_LEAK: model response contains CJK characters (> 30%)');
        }

        result = candidate;
        successProvider = `${entry.provider}/${entry.modelName}`;
        setActiveProvider(entry.provider, entry.modelName);
        devLog(`[api/chat] Using ${entry.provider}/${entry.modelName} (chain: ${chain.map(e => e.provider).join(' -> ')})`);
        break;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const candidateMsg = lastStreamErrorMsg ?? msg;
        if (RATE_LIMIT_RE.test(candidateMsg)) await markProviderRateLimited(entry.provider, candidateMsg);
        const isToolCallBug = TOOL_CALL_BUG_RE.test(msg);
        console.error(`[api/chat] ${isToolCallBug ? 'tool call failure' : 'failed'} on ${entry.provider}/${entry.modelName}, trying next... ${redactPII(msg)}`);
        failedReasons.push({ provider: `${entry.provider}/${entry.modelName}`, reason: msg });
        result = null;
      } finally { clearChatContext(); }
    }

    if (!result || !successProvider) {
      console.error('[api/chat] All providers failed:', failedReasons);
      return Response.json({
        error: 'ALL_PROVIDERS_FAILED', message: 'Tat ca AI provider deu fail.',
        userMessage: 'Ba Chu gap chut truc trac ky thuat. Em thu lai sau it phut nhe!', retryable: true, retryAfterSeconds: 10, tried, reasons: failedReasons,
      }, { status: 503 });
    }

    devLog(`[api/chat] Using ${successProvider} (of ${chain.length} available)`);

    try {
      if (typeof result.toUIMessageStreamResponse === 'function') return result.toUIMessageStreamResponse();
      if (typeof result.toDataStreamResponse === 'function') return result.toDataStreamResponse();
    } catch (streamErr) {
      console.error('[api/chat] stream response init failed:', redactPII(streamErr instanceof Error ? `${streamErr.message}\n${streamErr.stack}` : String(streamErr)));
      return Response.json({ error: 'STREAM_INIT_FAILED', message: streamErr instanceof Error ? streamErr.message : 'unknown' }, { status: 500 });
    }
    const text = await result.text;
    return new Response(text ?? '', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  } catch (err) {
    console.error('[api/chat] fatal:', redactPII(err instanceof Error ? err.message : 'unknown'));
    return Response.json({ error: 'CHAT_FAILED' }, { status: 500 });
  }
}

export async function GET() { return Response.json({ error: 'METHOD_NOT_ALLOWED' }, { status: 405 }); }
export async function PUT() { return Response.json({ error: 'METHOD_NOT_ALLOWED' }, { status: 405 }); }
export async function DELETE() { return Response.json({ error: 'METHOD_NOT_ALLOWED' }, { status: 405 }); }
export async function PATCH() { return Response.json({ error: 'METHOD_NOT_ALLOWED' }, { status: 405 }); }