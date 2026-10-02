// A simple branded email that renders well in Gmail, Outlook and phone mail apps (tables + inline styles).

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function renderEmail({ title, body, ctaLabel, ctaUrl, footer }: { title: string; body: string; ctaLabel?: string; ctaUrl?: string; footer?: string }): string {
  const paragraphs = body.split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#3b4865">${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
  const button = ctaLabel && ctaUrl
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:22px 0 6px"><tr><td style="background:#0150c8;border-radius:5px"><a href="${esc(ctaUrl)}" style="display:inline-block;padding:13px 22px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none">${esc(ctaLabel)}</a></td></tr></table>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f4f7fc;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fc;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e4e9f2;border-radius:5px">
<tr><td style="background:#0150c8;padding:18px 28px;border-radius:5px 5px 0 0;font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-.3px">DigitMonie</td></tr>
<tr><td style="height:4px;background:#f0ca56;font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 16px;font-size:21px;line-height:1.3;color:#0b1733">${esc(title)}</h1>
${paragraphs}${button}
</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #e4e9f2;font-size:12px;line-height:1.6;color:#6b7794">${esc(footer ?? "DigitMonie is licensed by the FCCPC. We will never ask for your PIN, password or one-time code.")}</td></tr>
</table></td></tr></table></body></html>`;
}
