import nodemailer from 'nodemailer';

const brandName = 'ASMMR';
const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].replace(/\/$/, '');
const logoUrl = process.env.EMAIL_LOGO_URL || `${clientUrl}/asmmr-logo.png`;
const from = process.env.EMAIL_FROM || `ASMMR <${process.env.SMTP_USER || 'no-reply@asmmr.org'}>`;

const transporter = process.env.SMTP_HOST ? nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
}) : null;

const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[character]));

function layout({ preheader, heading, greeting, content, buttonLabel, buttonUrl }) {
  return `<!doctype html><html><body style="margin:0;background:#f2f7fb;font-family:Arial,sans-serif;color:#23384d">
  <div style="display:none;max-height:0;overflow:hidden">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2f7fb;padding:32px 12px"><tr><td align="center">
  <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 8px 30px rgba(16,54,82,.1)">
  <tr><td style="background:#062d54;padding:24px 36px"><img src="${escapeHtml(logoUrl)}" alt="${brandName}" width="105" style="display:block;max-height:54px;object-fit:contain"><div style="color:#9dddf4;font-size:12px;letter-spacing:1.5px;margin-top:12px">ADVANCING REASEARCH</div></td></tr>
  <tr><td style="padding:36px"><h1 style="margin:0 0 18px;color:#092d54;font-size:26px;line-height:1.25">${escapeHtml(heading)}</h1><p style="font-size:15px;line-height:1.7;margin:0 0 18px">${escapeHtml(greeting)}</p>${content}
  ${buttonLabel && buttonUrl ? `<p style="margin:28px 0"><a href="${escapeHtml(buttonUrl)}" style="display:inline-block;background:#0874ad;color:#fff;text-decoration:none;padding:13px 22px;border-radius:7px;font-weight:bold">${escapeHtml(buttonLabel)}</a></p>` : ''}
  <p style="font-size:14px;line-height:1.7;color:#66798b;margin:26px 0 0">Kind regards,<br><strong>The ASMMR Team</strong></p></td></tr>
  <tr><td style="background:#edf4f8;padding:20px 36px;color:#708394;font-size:12px;line-height:1.6">This is an automated service email from ASMMR. Please do not reply to this message.<br>&copy; ${new Date().getFullYear()} ASMMR. All rights reserved.</td></tr>
  </table></td></tr></table></body></html>`;
}

export async function sendMail(message) {
  if (!transporter) {
    const error = new Error('Email delivery is not configured. Add the SMTP settings and try again.');
    error.status = 503;
    throw error;
  }
  return transporter.sendMail({ from, ...message });
}

export async function sendOtpEmail({ to, name, code, purpose }) {
  const verification = purpose === 'verify-email';
  const heading = verification ? 'Verify your email address' : 'Reset your password';
  const action = verification ? 'complete your registration' : 'reset your password';
  return sendMail({
    to,
    subject: `${code} is your ASMMR ${verification ? 'verification' : 'password reset'} code`,
    text: `Hello ${name || 'there'},\n\nUse ${code} to ${action}. This code expires in 10 minutes. If you did not request this, you can ignore this email.`,
    html: layout({ preheader: `Your ASMMR code is ${code}`, heading, greeting: `Hello ${name || 'there'},`, content: `<p style="font-size:15px;line-height:1.7">Use the verification code below to ${action}. It expires in 10 minutes.</p><div style="background:#edf7fb;border:1px solid #c9e8f4;border-radius:10px;padding:18px;text-align:center;font-size:30px;font-weight:bold;letter-spacing:8px;color:#075a8d">${code}</div><p style="font-size:13px;line-height:1.6;color:#708394">If you did not request this code, you can safely ignore this email. Never share this code with anyone.</p>` }),
  });
}

export async function sendSubmissionEmail({ to, name, title, status, reason = '', audience = 'author' }) {
  const statusCopy = {
    submitted: ['Submission received', 'Your manuscript has been received and is now awaiting review.'],
    resubmitted: ['Revised submission received', 'Your improved manuscript has been received and returned to the review queue.'],
    approved: ['Submission approved', 'Congratulations—your submission has been approved.'],
    rejected: ['Submission decision', 'Your submission was not approved at this time.'],
    'revision-requested': ['Improvements requested', 'The reviewer has requested improvements to your submission.'],
    assigned: ['New review assignment', 'A submission has been assigned to you for review.'],
    'new-review': ['New submission awaiting review', 'A new manuscript has been submitted and is awaiting reviewer attention.'],
  };
  const [heading, summary] = statusCopy[status] || ['Submission update', 'There is an update to this submission.'];
  const destination = audience === 'reviewer' ? `${clientUrl}/reviewer` : `${clientUrl}/portal`;
  const reasonHtml = reason ? `<div style="margin-top:20px;padding:16px;border-left:4px solid #159fd6;background:#f2f8fb"><strong>Reviewer feedback</strong><p style="margin:8px 0 0;line-height:1.6">${escapeHtml(reason)}</p></div>` : '';
  return sendMail({
    to,
    subject: `${heading}: ${title}`,
    text: `Hello ${name || 'there'},\n\n${summary}\n\nTitle: ${title}${reason ? `\n\nReviewer feedback: ${reason}` : ''}\n\nView details: ${destination}`,
    html: layout({ preheader: `${heading}: ${title}`, heading, greeting: `Hello ${name || 'there'},`, content: `<p style="font-size:15px;line-height:1.7">${escapeHtml(summary)}</p><div style="padding:16px;background:#f7fafc;border-radius:9px"><span style="font-size:12px;color:#74889a;text-transform:uppercase">Manuscript</span><p style="margin:6px 0 0;font-weight:bold;color:#173b5b">${escapeHtml(title)}</p></div>${reasonHtml}`, buttonLabel: audience === 'reviewer' ? 'Open reviewer portal' : 'View submission', buttonUrl: destination }),
  });
}

export function sendNotification(factory, context) {
  Promise.resolve().then(factory).catch(error => console.error(`Email notification failed (${context}):`, error.message));
}
