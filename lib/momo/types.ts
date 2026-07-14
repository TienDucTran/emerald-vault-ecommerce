// MoMo captureWallet API — types theo docs
// https://developers.momo.vn/v3/vi/docs/payment/api/wallet/onetime/

export interface CreatePaymentRequest {
  partnerCode: string;
  accessKey: string;
  requestId: string;
  amount: number;
  orderId: string;
  orderInfo: string;
  redirectUrl: string;
  ipnUrl: string;
  extraData: string;
  requestType: 'captureWallet' | 'payWithATM' | 'payWithCC';
  signature: string;
  lang?: 'vi' | 'en';
  orderGroupId?: string;
  autoCapture?: boolean;
}

export interface CreatePaymentResponse {
  partnerCode: string;
  orderId: string;
  requestId: string;
  amount: number;
  responseTime: number;
  message: string;
  resultCode: number; // 0 = success
  payUrl?: string;
  deeplink?: string;
  qrCodeUrl?: string;
  shortLink?: string;
  signature: string;
}

export interface MoMoIpnBody {
  partnerCode: string;
  orderId: string;
  requestId: string;
  amount: number;
  orderInfo: string;
  orderType: string;
  transId: number;
  resultCode: number;
  message: string;
  payType: string;
  responseTime: number;
  extraData: string;
  signature: string;
}

export const MOMO_RESULT_CODE = {
  SUCCESS: 0,
} as const;

export const MOMO_ENDPOINTS = {
  SANDBOX: 'https://test-payment.momo.vn/v2/gateway/api/create',
  PRODUCTION: 'https://payment.momo.vn/v2/gateway/api/create',
} as const;
