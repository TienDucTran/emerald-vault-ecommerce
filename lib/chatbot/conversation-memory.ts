// lib/chatbot/conversation-memory.ts
// Conversation Summarization — VIP upgrade Phase 4
// Giải quyết multi-turn window mà không token bloat
// Tóm tắt history cũ thành 1-2 câu summary, inject vào system prompt

import { createAdminClient } from '@/lib/supabase/admin';

const SUMMARY_THRESHOLD = 6; // khi history > 6 messages → summarize
const SUMMARY_KEEP_RECENT = 4; // giữ 4 messages gần nhất, summarize phần còn lại

/**
 * Load conversation summary từ chat_sessions.summary column.
 * Column được add qua migration 0040.
 */
export async function loadConversationSummary(sessionId: string): Promise<string | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('summary')
      .eq('id', sessionId)
      .single();

    if (error || !data) return null;
    return (data as any).summary ?? null;
  } catch {
    return null;
  }
}

/**
 * Update conversation summary trong DB.
 * Silent fail — không block chat flow.
 */
export async function saveConversationSummary(sessionId: string, summary: string): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase
      .from('chat_sessions')
      .update({ summary, updated_at: new Date().toISOString() })
      .eq('id', sessionId);
  } catch {
    // silent
  }
}

/**
 * Generate summary từ history messages (rule-based, không cần LLM).
 * Trích xuất: sản phẩm đã xem, câu hỏi đã hỏi, intent chính.
 *
 * Example output: "Khách đã hỏi về nhẫn bạc 925 vintage (đã xem 2 món), hỏi chính sách ship, để lại SĐT."
 */
export function generateRuleBasedSummary(
  messages: Array<{ role: string; content: string }>
): string {
  const userMessages = messages.filter((m) => m.role === 'user');
  const assistantMessages = messages.filter((m) => m.role === 'assistant');

  const topics: string[] = [];
  const productsMentioned = new Set<string>();
  let hasPhone = false;
  let hasEmail = false;
  let askedAboutPolicy = false;
  let askedAboutPromotion = false;

  // Extract từ user messages
  for (const msg of userMessages) {
    const text = msg.content.toLowerCase();

    // Product slugs from assistant responses
    // (checked below in assistant loop)

    // Policy questions
    if (/ship|giao hàng|vận chuyển|đổi trả|bảo hành|thanh toán|payment|cod/.test(text)) {
      askedAboutPolicy = true;
    }

    // Promotions
    if (/khuyến mãi|giảm giá|coupon|mã|ưu đãi|promotion|discount/.test(text)) {
      askedAboutPromotion = true;
    }

    // Contact info
    if (/(\+?84|0)\d{9,10}/.test(msg.content)) hasPhone = true;
    if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(msg.content)) hasEmail = true;
  }

  // Extract product slugs from assistant messages
  for (const msg of assistantMessages) {
    const slugRegex = /\/san-pham\/([a-z0-9-]+)/gi;
    let match;
    while ((match = slugRegex.exec(msg.content)) !== null) {
      productsMentioned.add(match[1]);
    }
  }

  // Build summary string
  if (productsMentioned.size > 0) {
    const productSlugs = Array.from(productsMentioned).slice(0, 3);
    topics.push(`đã xem sản phẩm: ${productSlugs.join(', ')}`);
  }

  if (askedAboutPolicy) topics.push('hỏi về chính sách (ship/đổi trả/bảo hành)');
  if (askedAboutPromotion) topics.push('hỏi về khuyến mãi');
  if (hasPhone) topics.push('đã để lại SĐT');
  if (hasEmail) topics.push('đã để lại email');

  if (topics.length === 0) return '';

  return `TÓM TẮT CUỘC TRÒ CHUYỆN TRƯỚC: Khách ${topics.join('; ')}.`;
}

/**
 * Decide có nên summarize không + trả summary để inject.
 * Logic:
 * - Nếu message count > SUMMARY_THRESHOLD → cần summarize
 * - Load summary từ DB (nếu đã có)
 * - Nếu chưa có → generate rule-based + save
 */
export async function getConversationSummary(
  sessionId: string,
  messageCount: number
): Promise<string> {
  if (messageCount <= SUMMARY_THRESHOLD) return '';

  // Try load từ DB trước
  let summary = await loadConversationSummary(sessionId);
  if (summary) return summary;

  // Generate mới — cần fetch messages để analyze
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(SUMMARY_THRESHOLD + 4);

    if (error || !data) return '';

    const messages = (data as any[]).reverse() as Array<{ role: string; content: string }>;
    summary = generateRuleBasedSummary(messages);

    if (summary) {
      await saveConversationSummary(sessionId, summary);
    }

    return summary;
  } catch {
    return '';
  }
}