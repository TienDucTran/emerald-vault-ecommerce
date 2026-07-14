// MoMo captureWallet client — gọi API tạo payment URL
// Dùng trong API route handler (server-side), KHÔNG dùng trong Client Component.

import { MOMO_ENDPOINTS, type CreatePaymentResponse, type MoMoIpnBody } from './types';
import { buildRequestSignature, verifyIpnSignature } from './signature';

export interface CreatePaymentInput {
  orderId: string;
  amount: number;
  orderInfo: string;
  extraData?: string;
  requestType?: 'captureWallet';
  redirectUrl: string;
  ipnUrl: string;
  requestId: string;
}

interface MoMoConfig {
  partnerCode: string;
  accessKey: string;
  secretKey: string;
  /** 'sandbox' (test) | 'production' */
  env: 'sandbox' | 'production';
}

function getConfig(): MoMoConfig | null {
  const partnerCode = process.env.MOMO_PARTNER_CODE;
  const accessKey = process.env.MOMO_ACCESS_KEY;
  const secretKey = process.env.MOMO_SECRET_KEY;
  if (!partnerCode || !accessKey || !secretKey) return null;
  return {
    partnerCode,
    accessKey,
    secretKey,
    env: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
  };
}

/** Trả về false nếu thiếu env — caller quyết định fallback hay 503. */
export function isMoMoConfigured(): boolean {
  return getConfig() !== null;
}

export async function createMoMoPayment(input: CreatePaymentInput): Promise<CreatePaymentResponse> {
  const cfg = getConfig();
  if (!cfg) {
    throw new Error('MOMO_NOT_CONFIGURED');
  }

  const requestType = input.requestType ?? 'captureWallet';
  // Params theo docs (KHÔNG bao gồm accessKey, signature)
  const paramsForSig: Record<string, string | number> = {
    requestType,
    orderId: input.orderId,
    amount: input.amount,
    orderInfo: input.orderInfo,
    redirectUrl: input.redirectUrl,
    ipnUrl: input.ipnUrl,
    requestId: input.requestId,
    extraData: input.extraData ?? '',
  };

  const signature = buildRequestSignature(paramsForSig, cfg.accessKey, cfg.secretKey);

  const body = {
    ...paramsForSig,
    partnerCode: cfg.partnerCode,
    accessKey: cfg.accessKey,
    signature,
    lang: 'vi',
  };

  const url = cfg.env === 'production' ? MOMO_ENDPOINTS.PRODUCTION : MOMO_ENDPOINTS.SANDBOX;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`MOMO_HTTP_${res.status}`);
  }
  const json = (await res.json()) as CreatePaymentResponse;
  return json;
}

export { verifyIpnSignature };
export type { MoMoIpnBody };
