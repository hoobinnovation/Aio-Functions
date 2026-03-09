import { AppError } from '../core/errors';

export interface FawaterkConfig {
  apiKey: string;
  baseUrl: string;
  paymentMethodId: string;
  currency?: string;
  returnUrl?: string;
  webhookSecret?: string;
}

export interface FawaterkCreateInvoiceInput {
  orderId: string;
  amountCents: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  redirectUrl?: string;
}

export interface FawaterkCreateInvoiceResult {
  invoiceKey: string;
  paymentUrl: string;
  externalReference: string;
  raw: unknown;
}

export interface FawaterkWebhookResult {
  invoiceKey: string;
  status: string;
  externalReference: string;
  raw: unknown;
}


const fetchAny: any = (globalThis as any).fetch;

function cryptoHmacSha256(secret: string, raw: string): string {
  const cryptoLib: any = (globalThis as any).require ? (globalThis as any).require('crypto') : eval('require')("crypto");
  return cryptoLib.createHmac('sha256', secret).update(raw).digest('hex');
}

function asSafeErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'provider_error';
}

export function assertFawaterkWebhookSignature(rawBody: string, receivedSignature: string | undefined, secret: string | undefined): void {
  if (!secret) return;
  if (!receivedSignature) {
    throw new AppError('PAYMENT_WEBHOOK_INVALID', 'Missing webhook signature');
  }

  const computed = cryptoHmacSha256(secret, rawBody);
  if (computed !== receivedSignature) {
    throw new AppError('PAYMENT_WEBHOOK_INVALID', 'Invalid webhook signature');
  }
}

export async function createFawaterkInvoice(config: FawaterkConfig, input: FawaterkCreateInvoiceInput): Promise<FawaterkCreateInvoiceResult> {
  if (!config.apiKey || !config.paymentMethodId) {
    throw new AppError('PAYMENT_PROVIDER_ERROR', 'Fawaterk provider configuration is incomplete');
  }

  const endpoint = `${config.baseUrl.replace(/\/$/, '')}/api/v2/createInvoiceLink`;

  const body = {
    cartTotal: Number((input.amountCents / 100).toFixed(2)),
    currency: config.currency ?? 'EGP',
    customer: {
      first_name: input.customerName,
      last_name: '.',
      email: input.customerEmail ?? 'guest@aio.local',
      phone: input.customerPhone,
      address: 'AIO checkout',
    },
    redirectionUrls: {
      successUrl: input.redirectUrl ?? config.returnUrl ?? '',
      failUrl: input.redirectUrl ?? config.returnUrl ?? '',
      pendingUrl: input.redirectUrl ?? config.returnUrl ?? '',
    },
    cartItems: [
      {
        name: `order-${input.orderId}`,
        price: Number((input.amountCents / 100).toFixed(2)),
        quantity: 1,
      },
    ],
    payment_method_id: config.paymentMethodId,
    orderId: input.orderId,
  };

  try {
    if (!fetchAny) {
      throw new AppError('PAYMENT_PROVIDER_ERROR', 'Global fetch is not available in runtime');
    }

    const resp = await fetchAny(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const raw = await resp.json().catch(() => ({}));

    if (!resp.ok || !raw?.data?.url || !raw?.data?.invoice_id) {
      throw new AppError('PAYMENT_SESSION_CREATE_FAILED', 'Failed to create Fawaterk payment link', { status: resp.status });
    }

    return {
      invoiceKey: String(raw.data.invoice_id),
      paymentUrl: String(raw.data.url),
      externalReference: String(raw.data.invoice_id),
      raw,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError('PAYMENT_PROVIDER_ERROR', `Fawaterk request failed: ${asSafeErrorMessage(err)}`);
  }
}

export function mapFawaterkStatus(rawStatus: string | undefined): string {
  const status = String(rawStatus ?? '').toLowerCase();
  if (['paid', 'success', 'successful'].includes(status)) return 'paid';
  if (['pending', 'processing'].includes(status)) return 'processing';
  if (['cancelled', 'canceled'].includes(status)) return 'cancelled';
  if (['expired'].includes(status)) return 'expired';
  if (['failed', 'declined'].includes(status)) return 'failed';
  return 'unknown';
}

export function parseFawaterkWebhookPayload(payload: any): FawaterkWebhookResult {
  const invoiceKey = payload?.invoice_id ?? payload?.data?.invoice_id ?? payload?.invoiceKey;
  const status = payload?.status ?? payload?.data?.status;

  if (!invoiceKey) {
    throw new AppError('PAYMENT_WEBHOOK_INVALID', 'Missing invoice key');
  }

  return {
    invoiceKey: String(invoiceKey),
    status: mapFawaterkStatus(status),
    externalReference: String(invoiceKey),
    raw: payload,
  };
}
