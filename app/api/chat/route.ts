// AI Chatbot route (flows.md §15.7)
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
} from '@/lib/chatbot/client';
import { SYSTEM_PROMPT } from '@/lib/chatbot/system-prompt';
import { allTools } from '@/lib/chatbot/tools';
import {
  setChatContext,
  clearChatContext,
  runWithChatContext,
} from '@/lib/chatbot/tools';
import { getChatConfig } from '@/lib/chatbot/config';
import { rateLimit } from '@/lib/middleware';
import { redactPII } from '@/lib/log/redact';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Vercel Hobby plan = 10s ceiling, Pro = 60s. Setting to 25 lets Hobby silently
// cap while giving Pro room. STREAM_TIMEOUT_MS below is the hard budget we honor.
export const maxDuration = 25;

const COOKIE_NAME = 'ev_client_id';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 năm
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CONTENT_LENGTH_LIMIT = 256 * 1024; // 256KB max chat payload
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
  // Fix #3 (sprint 2026-07-27): wrap toàn bộ handler trong AsyncLocalStorage
  // scope để per-request context (sessionId/userId/provider/model) cô lập giữa
  // concurrent requests. Initial context tạm thời dùng placeholder — sẽ được
  // cập nhật bằng `setChatContext()` sau khi upsert session thành công (line ~100).
  //
  // Lý do dùng placeholder initial: route handler cần sessionId từ RPC
  // upsert_chat_session TRƯỚC khi set context, nhưng AsyncLocalStorage yêu cầu
  // initial value. enterWith() sau đó sẽ update toàn bộ async chain phía sau.
  return await runWithChatContext(
    {
      sessionId: 'pending',
      userId: null,
      provider: 'none',
      model: 'none',
    },
    async () => await handleChatPost(request)
  );
}

async function handleChatPost(request: NextRequest): Promise<Response> {
  try {
    // 0) Rate-limit (IP) — chặn spam và bảo vệ AI provider quota.
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
    const limit = await rateLimit('chat', {
      identifier: ip,
      limit: 20,
      window: '1 m',
    });
    if (!limit.ok) {
      return Response.json(
        {
          error: 'RATE_LIMITED',
          retryAfter: limit.retryAfter,
          userMessage: 'Em nhắn nhiều quá rồi, chờ một chút rồi hỏi tiếp nhé! 🙏',
          retryable: true,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(limit.retryAfter ?? 60),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(limit.resetAt),
          },
        }
      );
    }

    // 0b) Payload size guard (DoS surface)
    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > CONTENT_LENGTH_LIMIT) {
      return Response.json(
        {
          error: 'PAYLOAD_TOO_LARGE',
          userMessage: 'Tin nhắn quá lớn, em vui lòng rút gọn rồi gửi lại nhé!',
          retryable: false,
        },
        { status: 413 }
      );
    }

    const supabaseAdmin = createAdminClient();
    const chatCfg = getChatConfig();

    // 1) Parse body
    let body: { messages?: UIMessage[]; sessionId?: string };
    try {
      body = await request.json();
    } catch {
      return Response.json(
        {
          error: 'INVALID_JSON',
          userMessage: 'Tin nhắn bị lỗi định dạng, em thử gửi lại nhé!',
          retryable: false,
        },
        { status: 400 }
      );
    }
    const { messages = [] } = body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json(
        {
          error: 'NO_MESSAGES',
          userMessage: 'Em chưa nhập tin nhắn nào, em hỏi Bà Chủ điều gì đi nào!',
          retryable: false,
        },
        { status: 400 }
      );
    }
    if (messages.length > 50) {
      return Response.json(
        {
          error: 'TOO_MANY_MESSAGES',
          userMessage: 'Cuộc trò chuyện đã quá dài rồi, em hãy bắt đầu cuộc mới nhé! 🙏',
          retryable: false,
        },
        { status: 400 }
      );
    }

    // 2) Cookie clientId (NOT httpOnly — client must read it via useChatSession)
    const cookieStore = await cookies();
    let clientId = cookieStore.get(COOKIE_NAME)?.value;
    if (!clientId || !UUID_V4_REGEX.test(clientId)) {
      clientId = crypto.randomUUID();
      cookieStore.set(COOKIE_NAME, clientId, {
        // httpOnly removed — client reads via document.cookie (see hooks/use-chat-session.ts)
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: COOKIE_MAX_AGE,
      });
    }

    // 3) User (optional)
    const currentUser = await getCurrentUser();
    const userId = currentUser?.user?.id ?? null;

    // 4) Upsert session
    const { data: session, error: sessErr } = await supabaseAdmin.rpc(
      'upsert_chat_session',
      {
        p_client_id: clientId,
        p_user_id: userId,
      }
    );
    if (sessErr || !session) {
      console.error('[api/chat] session upsert failed:', redactPII(sessErr?.message ?? 'no session'));
      return Response.json(
        {
          error: 'SESSION_FAILED',
          userMessage: 'Bà Chủ gặp chút trục trặc, em thử lại sau ít phút nhé! 🙏',
          retryable: true,
        },
        { status: 500 }
      );
    }
    const sessionId = (session as { id: string }).id;

    // Fix #3 (sprint 2026-07-27): update ALS context với sessionId THẬT.
    // Initial placeholder 'pending' đã được set khi wrap handler; giờ
    // enterWith() sẽ làm tất cả tool call phía sau thấy sessionId chính xác.
    // Provider/model sẽ được update trong chain loop bằng setChatContext.
    setChatContext({
      sessionId,
      userId,
      provider: 'pending',
      model: 'pending',
    });

    // 5) Save latest user message (sliding window: only newest)
    const lastUserMsg = messages[messages.length - 1];
    if (lastUserMsg && (lastUserMsg as { role?: string }).role === 'user') {
      const rawContent = (lastUserMsg as { content?: unknown }).content;
      const content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
      // Per-message content size guard (Issue C4): chặn client bypass maxLength
      // hoặc gửi array of parts vượt giới hạn. Tính trên JSON-stringified length
      // (bao gồm wrapper) để cover cả string lẫn array-of-parts.
      if (content.length > 2000) {
        return Response.json(
          {
            error: 'MESSAGE_TOO_LONG',
            userMessage: 'Tin nhắn quá dài (tối đa 2000 ký tự). Em hãy rút gọn nhé!',
            retryable: false,
          },
          { status: 400 }
        );
      }
      const { error: insertErr } = await supabaseAdmin
        .from('chat_messages')
        .insert({
          session_id: sessionId,
          role: 'user',
          content,
        });
      if (insertErr) {
        console.error('[api/chat] save user msg failed:', redactPII(insertErr.message));
      }
    }

    // Update last_message_at
    await supabaseAdmin
      .from('chat_sessions')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', sessionId);

    // 6) Configured?
    if (!chatCfg.isConfigured) {
      const fakeText =
        'Xin lỗi, chatbot hiện chưa được cấu hình. Vui lòng liên hệ admin qua mục Liên hệ.';
      const { error: fallbackErr } = await supabaseAdmin
        .from('chat_messages')
        .insert({
          session_id: sessionId,
          role: 'assistant',
          content: fakeText,
        });
      if (fallbackErr) {
        console.error('[api/chat] save fallback msg failed:', redactPII(fallbackErr.message));
      }
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(fakeText));
          controller.close();
        },
      });
      return new Response(stream, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    type ChatRow = { role: string; content: string };

    // Khai báo regex/timeout ở đầu function (sau khi đã chắc chắn `extractText` cũng ở scope
    // này). Cẩn thận thứ tự declaration: các const dùng trong `orderedFiltered.filter(...)` ở
    // dòng ~188 phải được khai báo TRƯỚC khi filter chạy.
    // Match cụ thể schema validation error từ AI SDK. Tránh match standalone
    // 'validation' / 'schema' (có thể xuất hiện trong message hợp lệ) hoặc tên
    // tool riêng lẻ như 'getKnowledge' (false positive).
    const TOOL_CALL_BUG_RE = /parameters.*did not match|Invalid input for tool|tool_call.*failed|tool use.*validation/i;
    const TOOL_CALL_LEAK_RE = /function\s*=\s*\w+\s*>\s*[\{<]/i;
    const FUNCTION_TAG_RE = /<\/?function\s*>/i;
    // Llama 3.1/3.3 + tool calling + reasoning thường mất >9s. Timeout 9s cũ
    // fail toàn bộ chain vì model chưa kịp trả về chunk đầu tiên. Tăng lên 25s
    // để cover Vercel Hobby (30s cap, còn 5s buffer cho onFinish DB write).
    // Override qua env CHAT_STREAM_TIMEOUT_MS nếu cần tune runtime (đơn vị ms).
    const STREAM_TIMEOUT_MS = Number(process.env.CHAT_STREAM_TIMEOUT_MS) || 25_000;
    const RATE_LIMIT_RE = /rate limit|429|tokens per minute|\btpm\b|quota|too many requests|try again in/i;

    // 7) Sliding window: last messages from DB (anti-tampering)
    // Nếu incoming messages chỉ có 1 (first turn), tin tưởng client và dùng trực tiếp,
    // bỏ qua DB history để tránh corrupted data từ session cũ.
    const isFirstTurn = messages.length === 1;
    let orderedHistory: ChatRow[] = [];
    if (isFirstTurn) {
      // Dùng trực tiếp từ client, convert sang ModelMessage format
      orderedHistory = messages.map((m: any) => ({
        role: (m.role as string) ?? 'user',
        content:
          typeof m.content === 'string'
            ? m.content
            : Array.isArray(m.content)
              ? m.content
                  .filter((p: any) => p?.type === 'text' && typeof p.text === 'string')
                  .map((p: any) => p.text)
                  .join('\n')
              : typeof m.parts === 'string'
                ? m.parts
                : '',
      })) as ChatRow[];
      devLog(`[api/chat] first turn — using client messages directly (${orderedHistory.length})`);
    } else {
      // Chỉ giữ 1 turn trước (user + assistant) để tránh echo duplicate response trong multi-turn.
      // Lý do: nếu load nhiều turn cũ, context có nhiều câu trả lời tương tự → model dễ generate
      // lại toàn bộ lịch sử thay vì chỉ trả lời câu hiện tại. Giới hạn 2 message (1 user + 1 assistant)
      // là đủ để model hiểu ngữ cảnh mà không bị "echo leak" từ các turn cũ.
      const { data: history, error: histErr } = await supabaseAdmin
        .from('chat_messages')
        .select('role, content')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(2); // chỉ giữ 1 turn trước (user + assistant) để tránh echo
      if (histErr) {
        console.error('[api/chat] load history failed:', redactPII(histErr.message));
      }
      orderedHistory = ((history ?? []) as ChatRow[]).reverse();
      devLog(`[api/chat] multi-turn — loaded ${orderedHistory.length} from DB (limit=2, anti-echo)`);
    }
    // (type ChatRow defined above)

    // AI SDK v6 yêu cầu `content` là array of parts (ModelMessage format), không phải string thuần.
    // Convert từ format DB {role, content: string} sang {role, content: [{type:'text', text}]}.
    // Nếu content là JSON string (do client lưu UIMessage với content là array), unwrap text từ parts.
    // Heuristic (Issue M4): chỉ parse JSON khi có structure rõ ràng (length >= 100 + starts with
    // [ hoặc {) để tránh mangle text ngắn/Vietnamese hợp lệ bắt đầu bằng ký tự đặc biệt.
    const extractText = (raw: string): string => {
      if (!raw) return '';
      const trimmed = raw.trim();
      // Text ngắn: gần như chắc chắn là plain text, không phải UIMessage parts JSON.
      if (trimmed.length < 100) return raw;
      // Phải bắt đầu bằng [ hoặc { mới thử parse JSON.
      if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) return raw;
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          // UIMessage parts format
          const textParts = parsed
            .filter((p: any) => p && p.type === 'text' && typeof p.text === 'string')
            .map((p: any) => p.text)
            .join('\n');
          if (textParts) return textParts;
        }
        if (parsed && typeof parsed === 'object' && typeof parsed.text === 'string') {
          return parsed.text;
        }
      } catch {
        // not JSON, return raw
      }
      return raw;
    };
    /**
     * Detect cross-language leak trong message content.
     * Tiếng Việt có thể chứa 1 số Hán tự Hán Việt (rất hiếm trong chat).
     * Nếu > 30% chars là CJK Unified Ideographs (U+4E00-U+9FFF) → treat như tiếng Trung → drop.
     * @returns true nếu message có ngôn ngữ sai cần bỏ qua.
     */
    function isCrossLanguageLeak(text: string): boolean {
      if (!text || text.length < 10) return false;
      const cjkCount = (text.match(/[\u4E00-\u9FFF]/g) || []).length;
      const hiraganaKatakanaCount = (text.match(/[\u3040-\u30FF]/g) || []).length;
      const foreignCount = cjkCount + hiraganaKatakanaCount;
      return foreignCount / text.length > 0.3;
    }
    // Filter messages: bỏ message rỗng + bỏ assistant không có text (chỉ gọi tool).
    // Groq/OpenAI reject 400 khi có 2 assistant empty content liên tiếp.
    // Bug 2: cũng skip nếu text chỉ chứa tool-call leak pattern (function=... hoặc <function> tag).
    // Bug 3: drop message có cross-language leak (>30% CJK) — model có thể follow pattern sai
    // từ history bị nhiễm ngôn ngữ Trung/Anh/Nhật.
    const orderedFiltered = orderedHistory.filter((m) => {
      const text = extractText(m.content).trim();
      if (!text) return false; // empty content
      if (isCrossLanguageLeak(text)) {
        devWarn(`[api/chat] dropping message with cross-language leak (role=${m.role}, length=${text.length})`);
        return false;
      }
      if (TOOL_CALL_LEAK_RE.test(text) || FUNCTION_TAG_RE.test(text)) {
        devWarn(`[api/chat] skipping message with tool-call leak artifact (role=${m.role})`);
        return false;
      }
      return m.role === 'user' || m.role === 'assistant' || m.role === 'system';
    });

    // Safety net: nếu 2 assistant message liên tiếp có text overlap cao (substring match),
    // bỏ cái sau. Phòng trường hợp DB đã lưu duplicate từ turn trước (echo bug cũ) và
    // model regenerate lại toàn bộ. Threshold: text ngắn >= 50 chars và nằm trong text dài.
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
            if (shorter.length > 50 && longer.includes(shorter)) {
              devWarn(`[api/chat] dedupe: skipping duplicate assistant message (shorter len=${shorter.length})`);
              continue;
            }
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

    // 8) Stream — thử từng provider trong chain (auto-fallback khi quota/404/401)
    const chain = getChatModelChain();
    if (chain.length === 0) {
      const cooldowns = await getCooldownInfo();
      const cfg = chatCfg;
      const missingKeys = [
        !cfg.groqKey && 'GROQ_API_KEY',
        !cfg.openrouterKey && 'OPENROUTER_API_KEY',
        !cfg.cerebrasKey && 'CEREBRAS_API_KEY',
        (!cfg.cloudflareKey || !cfg.cloudflareAccountId) && 'CLOUDFLARE_API_KEY/CLOUDFLARE_ACCOUNT_ID',
        !cfg.geminiKey && 'GOOGLE_AI_API_KEY',
        !cfg.openaiKey && 'OPENAI_API_KEY',
      ].filter(Boolean);
      const hasCooldowns = Object.keys(cooldowns).length > 0;
      console.error('[api/chat] No providers available.', {
        missingKeys,
        cooldowns,
      });
      return Response.json(
        {
          error: hasCooldowns ? 'ALL_PROVIDERS_COOLDOWN' : 'NO_PROVIDER',
          message: hasCooldowns
            ? 'Tất cả AI provider đang trong thời gian chờ rate limit. Vui lòng thử lại sau ít phút.'
            : `Chưa cấu hình AI provider. Thiếu env: ${missingKeys.join(', ')}.`,
          userMessage: hasCooldowns
            ? 'Bà Chủ đang bận một chút xíu, em chờ khoảng 30 giây rồi hỏi lại nhé! 🙏'
            : 'Bà Chủ đang bận chút, em quay lại sau nha.',
          retryable: hasCooldowns,
          retryAfterSeconds: hasCooldowns
            ? Math.max(...Object.values(cooldowns).map(ms => Math.ceil(ms / 1000)))
            : 60,
          missingKeys: hasCooldowns ? undefined : missingKeys,
          cooldowns: hasCooldowns ? cooldowns : undefined,
        },
        { status: 503 }
      );
    }

    const tried: string[] = [];
    const failedReasons: { provider: string; reason: string }[] = [];
    let result: any = null;
    let successProvider: string | null = null;
    let lastStreamErrorMsg: string | null = null;

    for (const entry of chain) {
      tried.push(`${entry.provider}/${entry.modelName}`);
      // Fix #2 (sprint 2026-07-27): reset lastStreamErrorMsg đầu mỗi iteration
      // để catch block không nhầm với error message của provider trước.
      // Trước đây nếu provider N timeout qua Promise.race, lastStreamErrorMsg
      // có thể vẫn giữ message của provider N-1 → RATE_LIMIT_RE.test() mark
      // nhầm provider khỏe → cooldown áp dụng sai.
      lastStreamErrorMsg = null;
      devLog(`[api/chat] Trying ${entry.provider}/${entry.modelName}...`);
      try {
        // Set per-request context so tool calls can read sessionId/userId/etc.
        // (Replaces removed AI SDK v6 `experimental_context` option.)
        setChatContext({
          sessionId,
          userId,
          provider: entry.provider,
          model: entry.modelName,
        });
        // Fix S1: AbortController riêng cho mỗi provider iteration. Khi
        // Promise.race timeout hoặc client disconnect, gọi controller.abort()
        // để AI SDK v6 cancel underlying stream → tránh waste quota + tool call
        // ghi DB sau khi response đã trả về client.
        const providerAbort = new AbortController();
        // Chain client abort signal: nếu client disconnect, tự abort provider.
        const chainAbort = () => providerAbort.abort();
        if (request.signal.aborted) {
          providerAbort.abort();
        } else {
          request.signal.addEventListener('abort', chainAbort, { once: true });
        }

        const candidate = streamText({
          model: entry.instance as unknown as Parameters<typeof streamText>[0]['model'],
          system: SYSTEM_PROMPT,
          messages: modelMessages as any,
          tools: allTools,
          stopWhen: stepCountIs(4),
          abortSignal: providerAbort.signal,
          // NOTE: `experimental_context` was removed in AI SDK v6. We pass
          // context to tool factories via closure (see lib/chatbot/tools).
          onFinish: ({ text, usage }) => {
            // Fire-and-forget via Vercel waitUntil — user already received the
            // streamed text; persisting must not race the function ceiling.
            waitUntil(
              (async () => {
                try {
                  await supabaseAdmin.from('chat_messages').insert({
                    session_id: sessionId,
                    role: 'assistant',
                    content: text,
                    tokens_used: usage?.totalTokens ?? null,
                  });
                  await supabaseAdmin
                    .from('chat_sessions')
                    .update({ last_message_at: new Date().toISOString() })
                    .eq('id', sessionId);
                } catch (e) {
                  console.error(
                    '[api/chat] persist assistant msg failed:',
                    redactPII(e instanceof Error ? e.message : 'unknown')
                  );
                }
              })()
            );
          },
          onError: ({ error }: { error: { message?: string } | Error | unknown }) => {
            const errMsg =
              error && typeof error === 'object' && 'message' in error
                ? (error as { message?: string }).message
                : String(error);
            lastStreamErrorMsg = errMsg ?? null;
            console.error(
              `[api/chat] streamText error (${entry.provider}/${entry.modelName}):`,
              redactPII(errMsg ?? '')
            );
          },
        });

        // Race consumeStream với timeout (STREAM_TIMEOUT_MS < maxDuration cap).
        // Khi timeout xảy ra, abort provider stream thật (không chỉ Promise.race).
        let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
        try {
          await Promise.race([
            candidate.consumeStream(),
            new Promise<never>((_, reject) => {
              timeoutHandle = setTimeout(() => {
                providerAbort.abort();
                reject(new Error('STREAM_TIMEOUT'));
              }, STREAM_TIMEOUT_MS);
            }),
          ]);
        } finally {
          if (timeoutHandle) clearTimeout(timeoutHandle);
          providerAbort.abort();
          request.signal.removeEventListener('abort', chainAbort);
        }

        // Bug 1: consumeStream pass ≠ text clean. Một số model (Groq, OpenRouter)
        // khi fail tool call schema sẽ generate raw text kiểu:
        //   "function=getKnowledge>{\"category\":\"warranty\"}<function>"
        // và stream thẳng ra client. Phải await result.text (Promise<string>)
        // để lấy full response, check leak pattern, rồi mới return.
        const fullText = await candidate.text;
        if (TOOL_CALL_LEAK_RE.test(fullText) || FUNCTION_TAG_RE.test(fullText)) {
          throw new Error(
            'TOOL_CALL_LEAK: model generated raw tool call text instead of API call'
          );
        }

        // Fix: cũng reject nếu response có cross-language leak (model spill tiếng Trung/Anh)
        if (isCrossLanguageLeak(fullText)) {
          throw new Error('CROSS_LANGUAGE_LEAK: model response contains CJK characters (> 30%)');
        }

        // consumeStream pass + text clean = OK, lưu result và return
        result = candidate;
        successProvider = `${entry.provider}/${entry.modelName}`;
        setActiveProvider(entry.provider, entry.modelName);
        devLog(
          `[api/chat] Using ${entry.provider}/${entry.modelName} (chain: ${chain.map(e => e.provider).join(' → ')})`
        );
        break;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const candidateMsg = lastStreamErrorMsg ?? msg;
        if (RATE_LIMIT_RE.test(candidateMsg)) {
          await markProviderRateLimited(entry.provider, candidateMsg);
        }
        const isToolCallBug = TOOL_CALL_BUG_RE.test(msg);
        const tag = isToolCallBug ? 'tool call failure' : 'failed';
        console.error(
          `[api/chat] ${tag} on ${entry.provider}/${entry.modelName}, trying next... ${redactPII(msg)}`
        );
        failedReasons.push({
          provider: `${entry.provider}/${entry.modelName}`,
          reason: msg,
        });
        result = null;
        // Tiếp tục provider tiếp theo
      } finally {
        clearChatContext();
      }
    }

    if (!result || !successProvider) {
      console.error('[api/chat] All providers failed:', failedReasons);
      return Response.json(
        {
          error: 'ALL_PROVIDERS_FAILED',
          message: 'Tất cả AI provider đều fail. Vui lòng thử lại sau hoặc kiểm tra quota.',
          userMessage: 'Bà Chủ gặp chút trục trặc kỹ thuật. Em thử lại sau ít phút nhé! 🙏',
          retryable: true,
          retryAfterSeconds: 10,
          tried,
          reasons: failedReasons,
        },
        { status: 503 }
      );
    }

    devLog(`[api/chat] Using ${successProvider} (of ${chain.length} available)`);

    // Tương thích AI SDK v6 — toUIMessageStreamResponse() trả Response stream.
    // Bọc try/catch để bắt lỗi stream init (provider abort, schema mismatch, etc.)
    try {
      if (typeof result.toUIMessageStreamResponse === 'function') {
        return result.toUIMessageStreamResponse();
      }
      if (typeof result.toDataStreamResponse === 'function') {
        return result.toDataStreamResponse();
      }
    } catch (streamErr) {
      console.error(
        '[api/chat] stream response init failed:',
        redactPII(streamErr instanceof Error ? `${streamErr.message}\n${streamErr.stack}` : String(streamErr))
      );
      // Trả JSON error để client nhận được thay vì "An error occurred" mù
      return Response.json(
        {
          error: 'STREAM_INIT_FAILED',
          message: streamErr instanceof Error ? streamErr.message : 'unknown',
        },
        { status: 500 }
      );
    }
    // Fallback: trả text stream thô
    const text = await result.text;
    return new Response(text ?? '', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (err) {
    console.error(
      '[api/chat] fatal:',
      redactPII(err instanceof Error ? err.message : 'unknown')
    );
    return Response.json({ error: 'CHAT_FAILED' }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ error: 'METHOD_NOT_ALLOWED' }, { status: 405 });
}

export async function PUT() {
  return Response.json({ error: 'METHOD_NOT_ALLOWED' }, { status: 405 });
}

export async function DELETE() {
  return Response.json({ error: 'METHOD_NOT_ALLOWED' }, { status: 405 });
}

export async function PATCH() {
  return Response.json({ error: 'METHOD_NOT_ALLOWED' }, { status: 405 });
}
