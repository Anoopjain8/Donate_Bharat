const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const configured = Boolean(env.smtp.host && env.smtp.user);
  transporter = configured
    ? nodemailer.createTransport({
        host: env.smtp.host,
        port: env.smtp.port,
        secure: env.smtp.port === 465,
        auth: { user: env.smtp.user, pass: env.smtp.pass },
      })
    : nodemailer.createTransport({ jsonTransport: true });
  return transporter;
}

/**
 * Send an email. Falls back to a JSON transport (dev) when SMTP is unset,
 * so the app never crashes for missing mail config.
 */
async function sendEmail({ to, subject, text, html }) {
  const info = await getTransporter().sendMail({
    from: env.smtp.from,
    to,
    subject,
    text,
    html,
  });
  if (env.nodeEnv !== 'production') {
    // eslint-disable-next-line no-console
    console.log(`[mail] ${subject} -> ${to} (${info.messageId})`);
  }
  return info;
}

module.exports = { sendEmail };
