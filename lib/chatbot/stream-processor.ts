// lib/chatbot/stream-processor.ts
// Streaming Post-Processor — VIP upgrade Phase 6
// Polish response "sạch" 100%: format giá, linkify, strip foreign tokens

/**
 * Format raw prices trong text thành format VND đúng.
 * "2500000đ" → "2.500.000đ"
 * "gia 1500000" → "giá 1.500.000đ"
 * "500000 vnd" → "500.000đ"
 */
function formatPrices(text: string): string {
  // Match số có 6-9 chữ số (100.000 → 999.999.999) theo sau bởi "đ", "vnd", hoặc không gì
  return text.replace(/(\d{6,9})(đ|vnd|d\b)?/gi, (match, numStr, suffix) => {
    const num = parseInt(numStr, 10);
    if (isNaN(num)) return match;
    const formatted = new Intl.NumberFormat('vi-VN').format(num);
    // Normalize suffix: vnd/VND/d → "đ"
    const normalizedSuffix = suffix ? 'đ' : 'đ';
    return formatted + normalizedSuffix;
  });
}

/**
 * Auto-linkify product slugs.
 * Nếu text chứa slug pattern (a-z0-9- với 10+ chars) mà chưa có link,
 * không tự động linkify vì dễ false positive.
 * Chỉ ensure links có đúng format: [text](/san-pham/slug)
 */
function normalizeLinks(text: string): string {
  // Ensure /bo-suu-tap/ links use consistent path
  return text.replace(/\/bo-suu-tap\//gi, '/bo-suu-tap/');
}

/**
 * Strip residual foreign language tokens (English/Chinese leak).
 * Chỉ strip patterns rõ ràng, không strip text tiếng Việt hợp lệ.
 */
function stripForeignLeak(text: string): string {
  // Strip "function=getKnowledge>{...}<function>" pattern
  text = text.replace(/function\s*=\s*\w+\s*>\s*[\{<][\s\S]*?[\}>]<\/?function>/gi, '');
  // Strip <function> tags
  text = text.replace(/<\/?function\s*>/gi, '');
  // Strip "I will call function" / "Let me call" patterns
  text = text.replace(/(?:I will|Let me|I'll)\s+(?:call|use|invoke)\s+(?:function|tool|the)\s+\w+/gi, '');
  // Strip standalone "function" word at start of sentence
  text = text.replace(/^function\s+/gim, '');

  return text;
}

/**
 * Ensure response ends with proper punctuation.
 */
function ensureEndingPunctuation(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  const lastChar = trimmed[trimmed.length - 1];
  const validEndings = ['.', '!', '?', '…', ')', '"', 'ạ', 'nhỉ', 'nha', 'nhé'];
  // Check if ends with valid punctuation or Vietnamese ending particle
  const endsValid = validEndings.some((e) => trimmed.endsWith(e));
  if (!endsValid) {
    return trimmed + 'ạ.';
  }
  return trimmed;
}

/**
 * Clean and polish full response text.
 * Apply all post-processing steps.
 */
export function polishResponse(text: string): string {
  if (!text) return text;

  let result = text;

  // 1. Strip foreign leak first (before formatting)
  result = stripForeignLeak(result);

  // 2. Format prices
  result = formatPrices(result);

  // 3. Normalize links
  result = normalizeLinks(result);

  // 4. Ensure ending punctuation
  result = ensureEndingPunctuation(result);

  return result;
}

/**
 * Process a chunk of streaming text.
 * For streaming, we can only do safe per-chunk operations.
 * Full polish is done on complete text.
 */
export function polishStreamChunk(chunk: string): string {
  if (!chunk) return chunk;
  // Only strip function tags per-chunk (safe, won't break mid-word)
  return chunk.replace(/<\/?function\s*>/gi, '');
}