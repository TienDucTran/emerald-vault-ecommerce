// lib/chatbot/intent-router.ts
// Intent Routing Layer — VIP upgrade
// Bypass LLM cho câu hỏi đơn giản (FAQ, small talk, chính sách cơ bản)
// Tiết kiệm 40-60% latency + cost

import { STATIC_FAQS, findStaticFaqByKeyword, SHOP_INFO, type StaticFaq } from './static-knowledge';

export type IntentType =
  | 'small_talk'
  | 'policy_question'
  | 'product_search'
  | 'order_inquiry'
  | 'complaint'
  | 'contact_request'
  | 'complex'
  | 'unknown';

export interface IntentResult {
  type: IntentType;
  confidence: number; // 0-1
  matchedFaq: StaticFaq | null;
  shortcutResponse: string | null; // nếu != null → trả thẳng, skip LLM
  shouldCallLeadCapture: boolean;
  detectedPhone: string | null;
  detectedEmail: string | null;
}

// Small talk patterns — chào hỏi, cảm ơn, tâm sự ngắn
const SMALL_TALK_PATTERNS: Array<{ regex: RegExp; response: string }> = [
  {
    regex: /^(chào|halo|hello|hi|hey|xin chào|chao|sawasdee|con ba|co chu)/i,
    response: 'Chào em! Bà Chủ đang sẵn sàng tư vấn đây ạ. Em đang tìm món trang sức nào cho mình hay làm quà đâu nhỉ?',
  },
  {
    regex: /(cảm ơn|cam on|thank|thanks|cám ơn|biết ơn)/i,
    response: 'Bà Chủ vui lắm khi giúp được em ạ! Em cần thêm gì cứ hỏi nha, tiệm luôn sẵn sàng.',
  },
  {
    regex: /^(ok|okay|okie|oke|được rồi|dc rồi|tốt|good|nice)/i,
    response: 'Dạ tốt quá ạ! Em còn thắc mắc gì nữa không nào?',
  },
  {
    regex: /(tạm biệt|bye|goodbye|see you|hẹn gặp)/i,
    response: 'Hẹn gặp lại em nha! Đừng quên ghé tiệm khi cần món nào xinh nhé. Bà Chủ luôn đợi em ạ.',
  },
];

// Complaint keywords — escalate Zalo
const COMPLAINT_KEYWORDS = [
  'tệ', 'thất vọng', 'quá lâu', 'ko thể', 'không thể', 'không hài lòng', 'k hài lòng',
  'không hài', 'k hài', 'phàn nàn', 'khiếu nại', 'khieu nai', 'đểu', 'lừa', 'luồn',
  'scam', 'phân bò', 'không đáng', 'k đáng', 'tiền mất', 'trả tiền', 'hoàn tiền',
  'đơn lỗi', 'giao sai', 'giao chậm', 'chưa nhận', 'chưa giao', 'quá hạn', 'treo hat',
];

// Order inquiry keywords
const ORDER_KEYWORDS = [
  'đơn hàng', 'don hang', 'mã đơn', 'ma don', 'order', 'vận đơn', 'van don',
  'giao hàng', 'giao hang', 'ship đến', 'ship den', 'chưa nhận', 'chua nhan',
  'tracking', 'kiểm tra đơn', 'kiem tra don', 'tra cứu', 'tra cuu',
];

// Contact request patterns
const CONTACT_KEYWORDS = [
  'liên hệ', 'lien he', 'địa chỉ', 'dia chi', 'số điện thoại', 'so dien thoai',
  'hotline', 'email', 'zalo', 'facebook', 'instagram', 'mở cửa', 'mo cua',
  'giờ làm việc', 'gio lam viec',
];

/**
 * Detect phone number in text
 */
function detectPhone(text: string): string | null {
  const m = text.match(/(\+?84|0)\d{9,10}\b/);
  return m ? m[0] : null;
}

/**
 * Detect email in text
 */
function detectEmail(text: string): string | null {
  const m = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return m ? m[0] : null;
}

/**
 * Classify user intent từ message text.
 * Nếu confidence cao → trả shortcutResponse, route handler skip LLM.
 */
export function classifyIntent(message: string): IntentResult {
  const text = message.trim();
  const lower = text.toLowerCase();

  // Detect contact info (phone/email) — luôn check đầu tiên
  const detectedPhone = detectPhone(text);
  const detectedEmail = detectEmail(text);

  // 1. Small talk check (highest priority cho shortcut)
  for (const pattern of SMALL_TALK_PATTERNS) {
    if (pattern.regex.test(text)) {
      return {
        type: 'small_talk',
        confidence: 0.95,
        matchedFaq: null,
        shortcutResponse: pattern.response,
        shouldCallLeadCapture: !!detectedPhone || !!detectedEmail,
        detectedPhone,
        detectedEmail,
      };
    }
  }

  // 2. Complaint check — escalate, không shortcut
  const complaintScore = COMPLAINT_KEYWORDS.reduce(
    (acc, kw) => (lower.includes(kw) ? acc + 1 : acc),
    0
  );
  if (complaintScore >= 1) {
    return {
      type: 'complaint',
      confidence: 0.8,
      matchedFaq: null,
      shortcutResponse: null, // để LLM xử lý với empathy + escalate
      shouldCallLeadCapture: !!detectedPhone || !!detectedEmail,
      detectedPhone,
      detectedEmail,
    };
  }

  // 3. Order inquiry — cần LLM + escalate Zalo (không shortcut)
  const orderScore = ORDER_KEYWORDS.reduce(
    (acc, kw) => (lower.includes(kw) ? acc + 1 : acc),
    0
  );
  if (orderScore >= 1) {
    return {
      type: 'order_inquiry',
      confidence: 0.75,
      matchedFaq: null,
      shortcutResponse: null, // để LLM gợi ý Zalo
      shouldCallLeadCapture: !!detectedPhone || !!detectedEmail,
      detectedPhone,
      detectedEmail,
    };
  }

  // 4. Contact request — có thể shortcut nếu match FAQ
  const contactScore = CONTACT_KEYWORDS.reduce(
    (acc, kw) => (lower.includes(kw) ? acc + 1 : acc),
    0
  );
  if (contactScore >= 1) {
    const faq = findStaticFaqByKeyword(text);
    if (faq && faq.category === 'contact') {
      return {
        type: 'contact_request',
        confidence: 0.9,
        matchedFaq: faq,
        shortcutResponse: faq.answer,
        shouldCallLeadCapture: !!detectedPhone || !!detectedEmail,
        detectedPhone,
        detectedEmail,
      };
    }
  }

  // 5. Policy question — shortcut nếu match FAQ với confidence cao
  const faq = findStaticFaqByKeyword(text);
  if (faq) {
    // Chỉ shortcut cho chính sách (không shortcut cho product — cần LLM search)
    const policyCategories = ['shipping', 'return', 'warranty', 'payment', 'about', 'care', 'size', 'general'];
    if (policyCategories.includes(faq.category)) {
      return {
        type: 'policy_question',
        confidence: 0.85,
        matchedFaq: faq,
        shortcutResponse: faq.answer,
        shouldCallLeadCapture: !!detectedPhone || !!detectedEmail,
        detectedPhone,
        detectedEmail,
      };
    }
  }

  // 6. Product search — cần LLM
  if (text.length > 3) {
    // Heuristic: nếu có từ khóa trang sức hoặc giá → product search
    const productKeywords = [
      'nhẫn', 'nhan', 'dây chuyền', 'day chuyen', 'bông tai', 'bong tai', 'hoa tai',
      'vòng tay', 'vong tay', 'mặt dây', 'mat day', 'pendant', 'trang sức', 'trang suc',
      'bạc', 'bac', 'vàng', 'vang', 'kim cương', 'kim cuong', 'diamond',
      'giá', 'gia', 'triệu', 'trieu', 'nghìn', 'nghin', 'k',
    ];
    const productScore = productKeywords.reduce(
      (acc, kw) => (lower.includes(kw) ? acc + 1 : acc),
      0
    );
    if (productScore >= 1) {
      return {
        type: 'product_search',
        confidence: 0.7,
        matchedFaq: null,
        shortcutResponse: null, // cần LLM + searchProducts tool
        shouldCallLeadCapture: !!detectedPhone || !!detectedEmail,
        detectedPhone,
        detectedEmail,
      };
    }
  }

  // 7. Unknown — để LLM xử lý
  return {
    type: 'unknown',
    confidence: 0.3,
    matchedFaq: null,
    shortcutResponse: null,
    shouldCallLeadCapture: !!detectedPhone || !!detectedEmail,
    detectedPhone,
    detectedEmail,
  };
}

/**
 * Generate escalation message cho complaint/order inquiry.
 */
export function generateEscalationMessage(intent: IntentResult, zaloLink: string): string {
  if (intent.type === 'complaint') {
    return `Em ơi, Bà Chủ rất xin lỗi vì trải nghiệm chưa tốt! Việc này tiệm cần xử lý trực tiếp cho em. Em nhắn Zalo tiệm ${zaloLink} kèm chi tiết, Bà Chủ hỗ trợ ngay trong hôm nay ạ.`;
  }
  if (intent.type === 'order_inquiry') {
    return `Em ơi, để tra đơn hàng chính xác, tiệm cần mã đơn của em. Em nhắn Zalo tiệm ${zaloLink} kèm mã đơn (bắt đầu bằng EV), Bà Chủ kiểm tra ngay nha. Hoặc em cho Bà Chủ SĐT/mã đơn đây ạ?`;
  }
  return '';
}