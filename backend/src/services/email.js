const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('../utils/logger');

let transporter = null;

const isConfigured = () => Boolean(env.smtp.host && env.smtp.user);

function getTransporter() {
  if (transporter) return transporter;
  const configured = isConfigured();
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
    logger.info({ to, subject }, 'mail sent');
  }
  return info;
}

module.exports = { sendEmail, isConfigured };
