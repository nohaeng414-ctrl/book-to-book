import nodemailer from "nodemailer";

export async function sendEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");

  if (!user || !pass) {
    throw new Error("بيانات GMAIL_USER أو GMAIL_APP_PASSWORD ناقصة في ملف البيئة");
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user,
      pass,
    },
  });

  await transporter.sendMail({
    from: `"تطبيق كتاب بكتاب" <${user}>`,
    to,
    subject,
    text,
    html,
  });
}