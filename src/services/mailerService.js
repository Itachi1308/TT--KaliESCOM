const nodemailer = require('nodemailer');

function getTransporter() {
  const host = process.env.SMTP_HOST || 'localhost';
  const port = Number(process.env.SMTP_PORT || 1025);
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';

  const opts = {
    host,
    port,
    secure: port === 465
  };

  if (user && pass) {
    opts.auth = { user, pass };
  }

  return nodemailer.createTransport(opts);
}

async function sendMail({ to, subject, text, html, from }) {
  const transporter = getTransporter();
  const fromAddr = from || process.env.FROM_EMAIL || 'no-reply@localhost';

  const info = await transporter.sendMail({
    from: fromAddr,
    to,
    subject,
    text,
    html
  });

  return info;
}

module.exports = { sendMail };
