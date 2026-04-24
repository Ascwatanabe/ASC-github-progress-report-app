import nodemailer from "nodemailer";

function transport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
}

export async function sendMail(opts: { to: string; subject: string; text: string }) {
  const t = transport();
  const from = process.env.SMTP_FROM;
  if (!t || !from) return { ok: false as const, error: "SMTP not configured" };
  await t.sendMail({ from, to: opts.to, subject: opts.subject, text: opts.text });
  return { ok: true as const };
}
