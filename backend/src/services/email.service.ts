import { env } from '../config/env';
import { logger } from '../config/logger';

/**
 * Lightweight email service.
 *
 * When `RESEND_API_KEY` is configured we deliver via the Resend HTTP API
 * (fetch is native on Node 18+). Otherwise we log the payload so developers
 * see the intent in the console without needing SMTP or an outbound relay.
 *
 * Never throws — email is best-effort. Callers should not gate business
 * transactions on delivery.
 */

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

const DEFAULT_FROM = 'AssetFlow <notifications@assetflow.local>';

async function deliverViaResend(payload: EmailPayload): Promise<boolean> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: payload.from ?? DEFAULT_FROM,
        to: Array.isArray(payload.to) ? payload.to : [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        reply_to: payload.replyTo,
      }),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      logger.warn('email: resend api rejected', {
        status: res.status,
        error: errBody.slice(0, 500),
      });
      return false;
    }
    return true;
  } catch (error) {
    logger.warn('email: resend api call failed', { error });
    return false;
  }
}

/** Send an email through the best available channel. Returns whether the
 *  transport reported success (or `false` on log-only fallback). */
export async function sendEmail(
  payload: EmailPayload,
): Promise<{ delivered: boolean; via: string }> {
  const delivered = await deliverViaResend(payload);
  if (delivered) return { delivered: true, via: 'resend' };
  logger.info('email (log-only fallback)', {
    to: payload.to,
    subject: payload.subject,
    from: payload.from ?? DEFAULT_FROM,
  });
  return { delivered: false, via: 'log' };
}

/** Render a minimal branded HTML wrapper around a notification body. */
export function renderNotificationEmail(params: {
  title: string;
  message: string;
  actionLabel?: string;
  actionUrl?: string;
  footer?: string;
}): string {
  const cta =
    params.actionLabel && params.actionUrl
      ? `<p style="margin:24px 0"><a href="${params.actionUrl}" style="background:#111;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">${params.actionLabel}</a></p>`
      : '';
  return `<!doctype html>
<html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111;background:#f6f6f7;padding:24px">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,.05)">
<h2 style="margin:0 0 8px">${params.title}</h2>
<p style="line-height:1.5;color:#333;margin:0">${params.message}</p>
${cta}
<hr style="border:0;border-top:1px solid #eee;margin:24px 0">
<div style="font-size:12px;color:#888">${params.footer ?? 'AssetFlow · This is an automated notification.'}</div>
</div></body></html>`;
}
