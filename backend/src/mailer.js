import nodemailer from 'nodemailer';
import { config } from './config.js';

const transporter = nodemailer.createTransport({
  host:   config.email.host,
  port:   config.email.port,
  secure: config.email.secure,
  auth:   { user: config.email.user, pass: config.email.pass },
});

export async function verifyMailer() {
  try {
    await transporter.verify();
    console.log('✅ Email transporter ready');
    return true;
  } catch (err) {
    console.error('❌ Email transporter failed:', err.message);
    return false;
  }
}

// -----------------------------------------------------------------------
// HTML Templates
// -----------------------------------------------------------------------
function warningHtml(willId, ownerAddress, daysLeft, deadline) {
  const urgentColor = daysLeft <= 3 ? '#E24B4A' : '#BA7517';
  const urgentBg    = daysLeft <= 3 ? '#FCEBEB' : '#FAEEDA';
  const urgentText  = daysLeft <= 3 ? '#A32D2D' : '#633806';
  return `<!DOCTYPE html><html><head><style>
    body{font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px}
    .wrap{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)}
    .hdr{background:${urgentColor};padding:24px 32px}
    .hdr h1{color:#fff;margin:0;font-size:22px}
    .hdr p{color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px}
    .body{padding:32px}
    .alert{background:${urgentBg};border:1px solid ${urgentColor};border-radius:8px;padding:16px;margin-bottom:24px}
    .alert p{margin:0;color:${urgentText};font-size:14px}
    .days{font-size:56px;font-weight:bold;color:${urgentColor};text-align:center;margin:16px 0 4px}
    .days-lbl{text-align:center;color:#666;font-size:14px;margin-bottom:24px}
    .info{background:#f9f9f9;border-radius:8px;padding:16px;margin-bottom:24px}
    .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee;font-size:13px}
    .row:last-child{border-bottom:none}
    .lbl{color:#666} .val{color:#333;font-family:monospace;font-size:12px}
    .cta{text-align:center;margin:24px 0}
    .cta a{background:${urgentColor};color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:bold;display:inline-block}
    .foot{padding:16px 32px;background:#f9f9f9;text-align:center;font-size:12px;color:#999}
  </style></head><body><div class="wrap">
    <div class="hdr"><h1>${daysLeft <= 3 ? '🚨' : '⚠️'} DotLegacy — Check-In Required</h1>
    <p>Your inheritance timer needs attention</p></div>
    <div class="body">
      <div class="alert"><p>Your DotLegacy will check-in deadline is approaching. If you do not check in before the deadline, your guardians will be able to trigger your inheritance distribution.</p></div>
      <div class="days">${daysLeft}</div>
      <div class="days-lbl">days remaining to check in</div>
      <div class="info">
        <div class="row"><span class="lbl">Will ID</span><span class="val">#${willId}</span></div>
        <div class="row"><span class="lbl">Owner</span><span class="val">${ownerAddress.slice(0,8)}...${ownerAddress.slice(-6)}</span></div>
        <div class="row"><span class="lbl">Deadline</span><span class="val">${deadline.toUTCString()}</span></div>
        <div class="row"><span class="lbl">Network</span><span class="val">Polkadot Hub TestNet</span></div>
      </div>
      <div class="cta"><a href="http://localhost:3000/dashboard">Check In Now →</a></div>
      <p style="font-size:13px;color:#666;text-align:center">Checking in takes one click and costs less than $0.01 in gas.</p>
    </div>
    <div class="foot">DotLegacy — On-Chain Crypto Inheritance | Polkadot Hub + PolkaVM</div>
  </div></body></html>`;
}

function claimableHtml(willId, ownerAddress) {
  return `<!DOCTYPE html><html><head><style>
    body{font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px}
    .wrap{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden}
    .hdr{background:#534AB7;padding:24px 32px}
    .hdr h1{color:#fff;margin:0;font-size:22px}
    .body{padding:32px}
    .alert{background:#EEEDFE;border:1px solid #534AB7;border-radius:8px;padding:16px;margin-bottom:24px}
    .alert p{margin:0;color:#3C3489;font-size:14px}
    .foot{padding:16px 32px;background:#f9f9f9;text-align:center;font-size:12px;color:#999}
  </style></head><body><div class="wrap">
    <div class="hdr"><h1>🔔 Will Is Now Claimable</h1></div>
    <div class="body">
      <div class="alert"><p><strong>Will #${willId}</strong> for <code>${ownerAddress}</code> has passed its grace period and is now claimable by guardians.</p></div>
      <p style="font-size:13px;color:#666">If this was a mistake, the owner can still check in to cancel the process.<br/><br/>Guardians can now submit their Shamir shares on the claim page.</p>
    </div>
    <div class="foot">DotLegacy — On-Chain Crypto Inheritance</div>
  </div></body></html>`;
}

// -----------------------------------------------------------------------
// Send functions
// -----------------------------------------------------------------------
export async function sendWarningEmail({ to, willId, ownerAddress, daysLeft, deadline }) {
  const subject = daysLeft <= 3
    ? `🚨 URGENT: DotLegacy check-in due in ${daysLeft} day${daysLeft === 1 ? '' : 's'}! — Will #${willId}`
    : `⚠️ DotLegacy: Check-in due in ${daysLeft} days — Will #${willId}`;

  const info = await transporter.sendMail({
    from: config.email.from, to, subject,
    html: warningHtml(willId.toString(), ownerAddress, daysLeft, deadline),
    text: `DotLegacy: Will #${willId} check-in due in ${daysLeft} days. Deadline: ${deadline.toUTCString()}`,
  });

  console.log(`📧 Warning email → ${to} (will #${willId}, ${daysLeft} days) | msgId: ${info.messageId}`);
  return info;
}

export async function sendClaimableEmail({ to, willId, ownerAddress }) {
  const info = await transporter.sendMail({
    from: config.email.from, to,
    subject: `🔔 DotLegacy: Will #${willId} is now claimable`,
    html: claimableHtml(willId.toString(), ownerAddress),
    text: `DotLegacy: Will #${willId} for ${ownerAddress} is now claimable by guardians.`,
  });

  console.log(`📧 Claimable email → ${to} (will #${willId}) | msgId: ${info.messageId}`);
  return info;
}

export async function sendWelcomeEmail({ to, willId, ownerAddress, checkInPeriodDays }) {
  const info = await transporter.sendMail({
    from: config.email.from, to,
    subject: `✅ DotLegacy: Will #${willId} created successfully`,
    html: `<!DOCTYPE html><html><head><style>
      body{font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px}
      .wrap{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden}
      .hdr{background:#1D9E75;padding:24px 32px}
      .hdr h1{color:#fff;margin:0;font-size:22px}
      .body{padding:32px}
      .ok{background:#E1F5EE;border:1px solid #1D9E75;border-radius:8px;padding:16px;margin-bottom:24px}
      .ok p{margin:0;color:#085041;font-size:14px}
      .info{background:#f9f9f9;border-radius:8px;padding:16px}
      .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee;font-size:13px}
      .row:last-child{border-bottom:none}
      .lbl{color:#666} .val{color:#333;font-family:monospace;font-size:12px}
      .foot{padding:16px 32px;background:#f9f9f9;text-align:center;font-size:12px;color:#999}
    </style></head><body><div class="wrap">
      <div class="hdr"><h1>✅ Will Created Successfully</h1></div>
      <div class="body">
        <div class="ok"><p>Your DotLegacy will has been created on-chain. You will receive email reminders before your check-in deadline.</p></div>
        <div class="info">
          <div class="row"><span class="lbl">Will ID</span><span class="val">#${willId}</span></div>
          <div class="row"><span class="lbl">Owner</span><span class="val">${ownerAddress}</span></div>
          <div class="row"><span class="lbl">Check-in period</span><span class="val">Every ${checkInPeriodDays} days</span></div>
          <div class="row"><span class="lbl">Network</span><span class="val">Polkadot Hub TestNet</span></div>
        </div>
      </div>
      <div class="foot">DotLegacy — On-Chain Crypto Inheritance | Polkadot Hub + PolkaVM</div>
    </div></body></html>`,
    text: `DotLegacy: Will #${willId} created. Check-in every ${checkInPeriodDays} days.`,
  });

  console.log(`📧 Welcome email → ${to} (will #${willId}) | msgId: ${info.messageId}`);
  return info;
}