import "server-only";
import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null | undefined;

function getTransporter() {
  if (transporter !== undefined) return transporter;
  if (!process.env.SMTP_HOST) {
    transporter = null;
    return transporter;
  }
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });
  return transporter;
}

export async function sendEmail(to: string, subject: string, text: string) {
  const t = getTransporter();
  if (!t) return; // email not configured — silently skip

  await t.sendMail({
    from: process.env.SMTP_FROM || "Asset Management <noreply@example.com>",
    to,
    subject,
    text,
  });
}
