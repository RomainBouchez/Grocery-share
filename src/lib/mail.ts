import "server-only";

/**
 * Envoi d'emails via l'API Resend (https://resend.com) en fetch direct —
 * aucune dépendance à installer, pratique sur le Raspberry Pi.
 *
 * Variables d'environnement :
 * - RESEND_API_KEY : clé API Resend (re_…)
 * - MAIL_FROM      : expéditeur, ex. "SharedCart <no-reply@mondomaine.fr>"
 *                    (le domaine doit être vérifié dans Resend)
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export function isMailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

/**
 * Envoie un email. Renvoie true si accepté par Resend, false sinon
 * (jamais d'exception : l'appelant décide quoi faire d'un échec).
 */
export async function sendMail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!apiKey || !from) {
    console.warn("[mail] RESEND_API_KEY ou MAIL_FROM manquant — email non envoyé");
    return false;
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, html, text }),
    });
    if (!res.ok) {
      console.error("[mail] Resend a refusé l'envoi", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[mail] échec d'envoi", err);
    return false;
  }
}

/** Gabarit HTML du mail de réinitialisation, aligné sur l'identité SharedCart. */
export function passwordResetEmailHtml({
  greeting,
  intro,
  buttonLabel,
  resetUrl,
  expiry,
  ignore,
}: {
  greeting: string;
  intro: string;
  buttonLabel: string;
  resetUrl: string;
  expiry: string;
  ignore: string;
}): string {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F5F5F5;font-family:'Hanken Grotesk',system-ui,-apple-system,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#FFFFFF;border-radius:24px;padding:36px 32px;box-shadow:0 2px 4px rgba(30,26,20,0.04);">
        <tr><td align="center" style="padding-bottom:20px;">
          <div style="font-size:22px;font-weight:900;letter-spacing:-0.03em;color:#1B1A16;">SharedCart</div>
        </td></tr>
        <tr><td style="font-size:16px;font-weight:700;color:#1B1A16;padding-bottom:8px;">${greeting}</td></tr>
        <tr><td style="font-size:14px;font-weight:500;color:#807C72;line-height:1.5;padding-bottom:24px;">${intro}</td></tr>
        <tr><td align="center" style="padding-bottom:24px;">
          <a href="${resetUrl}" style="display:inline-block;background:#2FB36A;color:#FFFFFF;font-size:15px;font-weight:800;text-decoration:none;padding:15px 32px;border-radius:999px;">${buttonLabel}</a>
        </td></tr>
        <tr><td style="font-size:13px;font-weight:500;color:#807C72;line-height:1.5;padding-bottom:6px;">${expiry}</td></tr>
        <tr><td style="font-size:13px;font-weight:500;color:#A8A498;line-height:1.5;">${ignore}</td></tr>
      </table>
      <div style="font-size:12px;color:#A8A498;padding-top:18px;">© SharedCart</div>
    </td></tr>
  </table>
</body>
</html>`;
}
