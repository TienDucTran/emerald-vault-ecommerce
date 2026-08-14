// lib/chatbot/sentiment.ts
// Sentiment Detection + Auto-Escalation — VIP upgrade Phase 5
// Phát hiện khách khó chịu → auto-escalate Zalo + priority lead

export type SentimentType = 'positive' | 'neutral' | 'negative' | 'frustrated';

export interface SentimentResult {
  type: SentimentType;
  score: number; // -1 (very negative) to +1 (very positive)
  shouldEscalate: boolean;
  detectedKeywords: string[];
}

// Negative keywords — xếp theo mức độ
const FRUSTRATION_KEYWORDS = [
  // Mức độ cao — cần escalate ngay
  'thất vọng', 'that vong', 'quá tệ', 'qua te', 'rất tệ', 'rat te',
  'không hài lòng', 'k hai long', 'không hài', 'k hài',
  'khiếu nại', 'khieu nai', 'phàn nàn', 'phan nan',
  'lừa đảo', 'lua dao', 'scam', 'phân bò', 'tiền mất', 'tien mat',
  'không bao giờ', 'k bao gio', 'không bao giờ mua', 'k bao gio mua',
  // Mức độ trung — cần theo dõi
  'chậm', 'cham', 'quá lâu', 'qua lau', 'chờ lâu', 'cho lau',
  'không thể', 'k the', 'ko thể', 'ko the',
  'chưa nhận', 'chua nhan', 'chưa giao', 'chua giao',
  'quá hạn', 'qua han', 'treo hat', 'treo mặc',
  'đểu', 'de~u', 'tồi', 'toi',
  'không đáng', 'k dang', 'ko đáng', 'ko dang',
  // Punctuation frustration
];

const POSITIVE_KEYWORDS = [
  'tuyệt', 'tuyet', 'đẹp', 'dep', 'xinh', 'yeu',
  'hài lòng', 'hai long', 'thích', 'thich', 'yêu', 'yeu',
  'cảm ơn', 'cam on', 'cám ơn', 'biết ơn',
  'tốt', 'tot', 'giỏi', 'gioi', 'chu đáo', 'chu dao',
  'uy tín', 'uy tin', 'chất lượng', 'chat luong',
];

/**
 * Detect sentiment từ message text.
 * Rule-based + keyword scoring (không cần LLM).
 */
export function detectSentiment(message: string): SentimentResult {
  const text = message.toLowerCase();
  const detected: string[] = [];
  let score = 0;

  // Check frustration keywords
  for (const kw of FRUSTRATION_KEYWORDS) {
    if (text.includes(kw)) {
      detected.push(kw);
      // Mức độ cao → score -2, mức độ trung → score -1
      const isHighSeverity = [
        'thất vọng', 'that vong', 'quá tệ', 'qua te', 'rất tệ', 'rat te',
        'không hài lòng', 'k hai long', 'không hài', 'k hài',
        'khiếu nại', 'khieu nai', 'phàn nàn', 'phan nan',
        'lừa đảo', 'lua dao', 'scam', 'phân bò', 'tiền mất', 'tien mat',
      ].includes(kw);
      score += isHighSeverity ? -2 : -1;
    }
  }

  // Check positive keywords
  for (const kw of POSITIVE_KEYWORDS) {
    if (text.includes(kw)) {
      detected.push(kw);
      score += 1;
    }
  }

  // Punctuation frustration — nhiều dấu chấm than liên tiếp hoặc ALL CAPS
  const exclamationCount = (message.match(/!/g) || []).length;
  if (exclamationCount >= 3) score -= 1;

  const upperRatio = (message.replace(/[^a-zA-Z]/g, '').match(/[A-Z]/g) || []).length /
    Math.max(1, message.replace(/[^a-zA-Z]/g, '').length);
  if (upperRatio > 0.5 && message.length > 20) score -= 1;

  // Normalize score to -1..+1
  const normalizedScore = Math.max(-1, Math.min(1, score / 4));

  // Determine type
  let type: SentimentType;
  if (score <= -3) {
    type = 'frustrated';
  } else if (score < 0) {
    type = 'negative';
  } else if (score > 0) {
    type = 'positive';
  } else {
    type = 'neutral';
  }

  // Should escalate if frustrated or strongly negative
  const shouldEscalate = type === 'frustrated' || score <= -3;

  return {
    type,
    score: normalizedScore,
    shouldEscalate,
    detectedKeywords: detected,
  };
}

/**
 * Generate empathy prefix cho response khi sentiment negative.
 * Dùng trước LLM response để thêm empathy.
 */
export function generateEmpathyPrefix(sentiment: SentimentResult): string {
  if (sentiment.type === 'frustrated') {
    return 'Em ơi, Bà Chủ rất xin lỗi vì em gặp bất tiện! ';
  }
  if (sentiment.type === 'negative') {
    return 'Bà Chủ hiểu em đang không hài lòng. ';
  }
  return '';
}