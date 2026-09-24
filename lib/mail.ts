import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

// Outgoing mail for sign-in codes. Any SMTP account works. The default is
// Gmail: set SMTP_USER to the address and SMTP_PASS to an App Password
// (Google Account → Security → 2-Step Verification → App passwords), not the
// account's normal password.

const env = process.env;
export const hasMailer = Boolean(env.SMTP_USER && env.SMTP_PASS);

/** In `next dev` without SMTP, codes go to the terminal instead, so the flow can be tested locally. */
export const devMailer = !hasMailer && env.NODE_ENV === "development";

let transport: Transporter | undefined;
function mailer() {
  const port = Number(env.SMTP_PORT || 465);
  transport ??= nodemailer.createTransport({
    host: env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure: port === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
  return transport;
}

export async function sendLoginCode(to: string, code: string): Promise<void> {
  if (devMailer) {
    console.log(`\n[dev mail] sign-in code for ${to}: ${code}\n`);
    return;
  }
  const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;
  await mailer().sendMail({
    from: env.MAIL_FROM || `CN Visualizer <${env.SMTP_USER}>`,
    to,
    subject: `${spaced} is your CN Visualizer sign-in code`,
    text: [
      `Your CN Visualizer sign-in code is ${spaced}`,
      "",
      "It works for 10 minutes. If you didn't try to sign in, ignore this email. Nobody can get in without the code.",
    ].join("\n"),
    html: `<div style="font-family:system-ui,sans-serif;max-width:420px;margin:auto;padding:24px;color:#1e4234">
  <p style="margin:0 0 8px;font-size:15px">Your CN Visualizer sign-in code:</p>
  <p style="margin:0 0 16px;font:700 34px/1.2 ui-monospace,Menlo,monospace;letter-spacing:6px;color:#24503F">${spaced}</p>
  <p style="margin:0;font-size:13px;color:#555">It works for 10 minutes. If you didn't try to sign in, ignore this email. Nobody can get in without the code.</p>
</div>`,
  });
}
