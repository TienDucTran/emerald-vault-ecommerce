// AI Chatbot route (flows.md §15.7)
import { streamText, stepCountIs, type UIMessage } from 'ai';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth/require-customer';
import { getChatModelChain, setActiveProvider, markProviderRateLimited, isProviderAvailable, getCooldownInfo } from '@/lib/chatbot/client';
import { SYSTEM_PROMPT } from '@/lib/chatbot/system-prompt';
import { allTools } from '@/lib/chatbot/tools';
import { getChatConfig } from '@/lib/chatbot/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const COOKIE_NAME = 'ev_client_id';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 năm
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();
    const chatCfg = getChatConfig();

    // 1) Parse body
    let body: { messages?: UIMessage[]; sessionId?: string };
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'INVALID_JSON' }, { status: 400 });
    }
    const { messages = [] } = body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: 'NO_MESSAGES' }, { status: 400 });
    }

    // 2) Cookie clientId
    const cookieStore = await cookies();
    let clientId = cookieStore.get(COOKIE_NAME)?.value;
    if (!clientId || !UUID_V4_REGEX.test(clientId)) {
      clientId = crypto.randomUUID();
      cookieStore.set(COOKIE_NAME, clientId, {
        httpOnly: true,
        sameSite: 'lax',
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
      console.error('[api/chat] session upsert failed:', sessErr?.message ?? 'no session');
      return Response.json({ error: 'SESSION_FAILED' }, { status: 500 });
    }
    const sessionId = (session as { id: string }).id;

    // 5) Save latest user message (sliding window: only newest)
    const lastUserMsg = messages[messages.length - 1];
    if (lastUserMsg && (lastUserMsg as { role?: string }).role === 'user') {
      const rawContent = (lastUserMsg as { content?: unknown }).content;
      const content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
      const { error: insertErr } = await supabaseAdmin
        .from('chat_messages')
        .insert({
          session_id: sessionId,
          role: 'user',
          content,
        });
      if (insertErr) {
        console.error('[api/chat] save user msg failed:', insertErr.message);
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
        console.error('[api/chat] save fallback msg failed:', fallbackErr.message);
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
    const TOOL_CALL_BUG_RE = /tool call|tool_use|validation|schema|getKnowledge/i;
    const TOOL_CALL_LEAK_RE = /function\s*=\s*\w+\s*>\s*[\{<]/i;
    const FUNCTION_TAG_RE = /<\/?function\s*>/i;
    const STREAM_TIMEOUT_MS = 25_000;
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
      console.log(`[api/chat] first turn — using client messages directly (${orderedHistory.length})`);
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
        console.error('[api/chat] load history failed:', histErr.message);
      }
      orderedHistory = ((history ?? []) as ChatRow[]).reverse();
      console.log(`[api/chat] multi-turn — loaded ${orderedHistory.length} from DB (limit=2, anti-echo)`);
    }
    // (type ChatRow defined above)

    // AI SDK v6 yêu cầu `content` là array of parts (ModelMessage format), không phải string thuần.
    // Convert từ format DB {role, content: string} sang {role, content: [{type:'text', text}]}.
    // Nếu content là JSON string (do client lưu UIMessage với content là array), unwrap text từ parts.
    const extractText = (raw: string): string => {
      if (!raw) return '';
      const trimmed = raw.trim();
      if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) return raw;
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((p: any) => p && p.type === 'text' && typeof p.text === 'string')
            .map((p: any) => p.text)
            .join('\n');
        }
        if (parsed && typeof parsed === 'object' && typeof parsed.text === 'string') {
          return parsed.text;
        }
      } catch {
        // not JSON, return raw
      }
      return raw;
    };
    // Filter messages: bỏ message rỗng + bỏ assistant không có text (chỉ gọi tool).
    // Groq/OpenAI reject 400 khi có 2 assistant empty content liên tiếp.
    // Bug 2: cũng skip nếu text chỉ chứa tool-call leak pattern (function=... hoặc <function> tag).
    const orderedFiltered = orderedHistory.filter((m) => {
      const text = extractText(m.content).trim();
      if (!text) return false; // empty content
      if (TOOL_CALL_LEAK_RE.test(text) || FUNCTION_TAG_RE.test(text)) {
        console.warn(`[api/chat] skipping message with tool-call leak artifact (role=${m.role})`);
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
              console.warn(`[api/chat] dedupe: skipping duplicate assistant message (shorter len=${shorter.length})`);
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
    console.log(`[api/chat] modelMessages count: ${modelMessages.length} (filtered from ${orderedHistory.length}), last:`, JSON.stringify(modelMessages[modelMessages.length - 1]).slice(0, 200));

    // 8) Stream — thử từng provider trong chain (auto-fallback khi quota/404/401)
    const chain = getChatModelChain();
    if (chain.length === 0) {
      const cooldowns = getCooldownInfo();
      const hasCooldowns = Object.keys(cooldowns).length > 0;
      if (hasCooldowns) {
        console.error('[api/chat] All providers in cooldown:', cooldowns);
        return Response.json(
          {
            error: 'ALL_PROVIDERS_COOLDOWN',
            message: 'Tất cả AI provider đang trong thời gian chờ rate limit. Vui lòng thử lại sau ít phút.',
            cooldowns,
          },
          { status: 503 }
        );
      }
      console.error('[api/chat] No AI provider configured — check env (GROQ_API_KEY / GOOGLE_AI_API_KEY / OPENAI_API_KEY)');
      return Response.json(
        {
          error: 'NO_PROVIDER',
          message: 'Chưa cấu hình AI provider. Thêm GROQ_API_KEY / GOOGLE_AI_API_KEY / OPENAI_API_KEY vào .env.local.',
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
      console.log(`[api/chat] Trying ${entry.provider}/${entry.modelName}...`);
      try {
        const candidate = streamText({
          model: entry.instance as unknown as Parameters<typeof streamText>[0]['model'],
          system: SYSTEM_PROMPT,
          messages: modelMessages as any,
          tools: allTools,
          stopWhen: stepCountIs(4),
          experimental_context: {
            sessionId: sessionId ?? 'unknown',
            userId: userId ?? null,
            // Truyền provider + model đang dùng cho từng tool call (analytics)
            provider: entry.provider,
            model: entry.modelName,
          },
          onFinish: async ({ text, usage }) => {
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
                '[api/chat] save assistant msg failed:',
                e instanceof Error ? e.message : 'unknown'
              );
            }
          },
          onError: ({ error }: { error: { message?: string } | Error | unknown }) => {
            const errMsg =
              error && typeof error === 'object' && 'message' in error
                ? (error as { message?: string }).message
                : String(error);
            lastStreamErrorMsg = errMsg ?? null;
            console.error(
              `[api/chat] streamText error (${entry.provider}/${entry.modelName}):`,
              errMsg
            );
          },
        });

        // Race consumeStream với timeout 25s (maxDuration=30, chừa 5s buffer).
        // Runtime errors (tool call schema mismatch từ Groq 70b, quota exceeded,
        // 401/404 mid-stream, ...) sẽ surface ở đây → fallback provider tiếp theo.
        let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
        try {
          await Promise.race([
            candidate.consumeStream(),
            new Promise<never>((_, reject) => {
              timeoutHandle = setTimeout(
                () => reject(new Error('STREAM_TIMEOUT')),
                STREAM_TIMEOUT_MS
              );
            }),
          ]);
        } finally {
          if (timeoutHandle) clearTimeout(timeoutHandle);
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

        // consumeStream pass + text clean = OK, lưu result và return
        result = candidate;
        successProvider = `${entry.provider}/${entry.modelName}`;
        setActiveProvider(entry.provider, entry.modelName);
        console.log(
          `[api/chat] Using ${entry.provider}/${entry.modelName} (chain: ${chain.map(e => e.provider).join(' → ')})`
        );
        break;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const candidateMsg = lastStreamErrorMsg ?? msg;
        if (RATE_LIMIT_RE.test(candidateMsg)) {
          markProviderRateLimited(entry.provider, candidateMsg);
        }
        const isToolCallBug = TOOL_CALL_BUG_RE.test(msg);
        const tag = isToolCallBug ? 'tool call failure' : 'failed';
        console.error(
          `[api/chat] ${tag} on ${entry.provider}/${entry.modelName}, trying next... ${msg}`
        );
        failedReasons.push({
          provider: `${entry.provider}/${entry.modelName}`,
          reason: msg,
        });
        result = null;
        // Tiếp tục provider tiếp theo
      }
    }

    if (!result || !successProvider) {
      console.error('[api/chat] All providers failed:', failedReasons);
      return Response.json(
        {
          error: 'ALL_PROVIDERS_FAILED',
          message: 'Tất cả AI provider đều fail. Vui lòng thử lại sau hoặc kiểm tra quota.',
          tried,
          reasons: failedReasons,
        },
        { status: 503 }
      );
    }

    console.log(`[api/chat] Using ${successProvider} (of ${chain.length} available)`);

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
        streamErr instanceof Error ? `${streamErr.message}\n${streamErr.stack}` : streamErr
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
      err instanceof Error ? err.message : 'unknown'
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
