import { ConfidentialClientApplication } from '@azure/msal-node'

const TENANT_ID = process.env.AZURE_TENANT_ID!
const CLIENT_ID = process.env.AZURE_CLIENT_ID!
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET!
const MAIL_FROM = process.env.MAIL_FROM || 'noreply@sutter.k12.ca.us'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

let _msalApp: ConfidentialClientApplication | null = null

function getMsalApp(): ConfidentialClientApplication {
  if (!_msalApp) {
    _msalApp = new ConfidentialClientApplication({
      auth: {
        clientId: CLIENT_ID,
        authority: `https://login.microsoftonline.com/${TENANT_ID}`,
        clientSecret: CLIENT_SECRET,
      },
    })
  }
  return _msalApp
}

async function getGraphToken(): Promise<string> {
  const result = await getMsalApp().acquireTokenByClientCredential({
    scopes: ['https://graph.microsoft.com/.default'],
  })
  if (!result?.accessToken) throw new Error('Failed to acquire MS Graph token')
  return result.accessToken
}

async function sendMail(to: string | string[], subject: string, html: string): Promise<void> {
  const token = await getGraphToken()
  const toAddresses = Array.isArray(to) ? to : [to]

  const body = {
    message: {
      subject,
      body: { contentType: 'HTML', content: html },
      toRecipients: toAddresses.map(addr => ({ emailAddress: { address: addr } })),
      from: { emailAddress: { address: MAIL_FROM } },
    },
    saveToSentItems: false,
  }

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${MAIL_FROM}/sendMail`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Graph sendMail failed ${res.status}: ${text}`)
  }
}

const SIGN_IN_URL = `${APP_URL}/auth/login`

// ---------------------------------------------------------------------------
// Shared HTML layout helpers
// ---------------------------------------------------------------------------

function emailWrapper(content: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SCSOS Special Education</title>
</head>
<body style="margin:0;padding:0;background:#f5f2ed;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f2ed;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:#1e3a2f;border-radius:12px 12px 0 0;padding:28px 36px;">
              <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#a8c4b0;">SCSOS</p>
              <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#ffffff;">Special Education Department</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:36px 36px 28px;border-left:1px solid #e8e3db;border-right:1px solid #e8e3db;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f5f2ed;border:1px solid #e8e3db;border-top:none;border-radius:0 0 12px 12px;padding:20px 36px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#8a7f74;">Sutter County Superintendent of Schools</p>
              <p style="margin:4px 0 0;font-size:12px;color:#b0a89f;">This is an automated message. Please do not reply to this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function infoRow(label: string, value: string) {
  return `<tr>
    <td style="padding:8px 14px;border-bottom:1px solid #f0ece6;">
      <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#8a7f74;">${label}</span>
    </td>
    <td style="padding:8px 14px;border-bottom:1px solid #f0ece6;">
      <span style="font-size:14px;color:#2d2926;font-weight:600;">${value}</span>
    </td>
  </tr>`
}

function confirmationBadge(number: string) {
  return `<div style="background:#f0f7f3;border:2px solid #2d6a4f;border-radius:10px;padding:16px 24px;text-align:center;margin:24px 0;">
    <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#2d6a4f;">Confirmation Number</p>
    <p style="margin:6px 0 0;font-size:28px;font-weight:800;letter-spacing:4px;color:#1e3a2f;font-family:monospace;">${number}</p>
    <p style="margin:6px 0 0;font-size:12px;color:#5a7a6a;">Keep this number to check your referral status</p>
  </div>`
}

function statusBadge(status: string, color = '#0284c7') {
  return `<span style="display:inline-block;background:${color}15;border:1px solid ${color}40;color:${color};font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;letter-spacing:0.5px;">${status}</span>`
}

function ctaButton(text: string, url: string) {
  return `<div style="text-align:center;margin:28px 0 8px;">
    <a href="${url}" style="display:inline-block;background:#1e3a2f;color:#ffffff;font-size:14px;font-weight:700;padding:12px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.5px;">${text}</a>
  </div>`
}

function escapeHtml(input: string) {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  NEW: 'Submitted',
  SHIPPED: 'Placed',
  RECEIVED: 'Ready for Pickup',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

const ORDER_STATUS_COLORS: Record<string, string> = {
  NEW: '#0284c7',
  SHIPPED: '#7c3aed',
  RECEIVED: '#d97706',
  COMPLETED: '#059669',
  CANCELLED: '#dc2626',
}

const REFERRAL_STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  PENDING_DOCUMENTS: 'Pending Documents',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  WAITLISTED: 'Waitlisted',
  ENROLLED: 'Enrolled',
  WITHDRAWN: 'Withdrawn',
}

// ---------------------------------------------------------------------------
// Order emails
// ---------------------------------------------------------------------------

interface OrderEmailData {
  orderNumber: string
  orderId: string
  requestorName: string
  requestorEmail: string
  schoolSite: string
  itemCount: number
  items: { itemName: string; quantity: number; estimatedPrice: number }[]
  totalEstimatedPrice: number
  submittedAt: string
}

export async function sendOrderSubmittedToStaff(recipients: string[], data: OrderEmailData) {
  if (!recipients.length) return

  const itemRows = data.items.map(item =>
    `<tr>
      <td style="padding:8px 14px;border-bottom:1px solid #f0ece6;font-size:14px;color:#2d2926;">${item.itemName}</td>
      <td style="padding:8px 14px;border-bottom:1px solid #f0ece6;font-size:14px;color:#2d2926;text-align:center;">${item.quantity}</td>
      <td style="padding:8px 14px;border-bottom:1px solid #f0ece6;font-size:14px;color:#2d2926;text-align:right;">$${(item.estimatedPrice * item.quantity).toFixed(2)}</td>
    </tr>`
  ).join('')

  const html = emailWrapper(`
    <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#1e3a2f;">New Order Submitted</p>
    <p style="margin:0 0 24px;font-size:14px;color:#6b6057;">A new supply order requires your attention.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f4;border:1px solid #e8e3db;border-radius:8px;margin-bottom:24px;">
      ${infoRow('Order Number', data.orderNumber)}
      ${infoRow('Requestor', `${data.requestorName} &lt;${data.requestorEmail}&gt;`)}
      ${infoRow('School / Site', data.schoolSite)}
      ${infoRow('Submitted', data.submittedAt)}
      ${infoRow('Items', String(data.itemCount))}
      ${infoRow('Est. Total', `$${data.totalEstimatedPrice.toFixed(2)}`)}
    </table>

    <p style="margin:0 0 10px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#8a7f74;">Items Ordered</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8e3db;border-radius:8px;margin-bottom:24px;overflow:hidden;">
      <thead>
        <tr style="background:#f0ece6;">
          <th style="padding:8px 14px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#8a7f74;">Item</th>
          <th style="padding:8px 14px;text-align:center;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#8a7f74;">Qty</th>
          <th style="padding:8px 14px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#8a7f74;">Total</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    ${ctaButton('View Order', `${APP_URL}/dashboard/orders/${data.orderId}`)}
  `)

  await sendMail(recipients, `New Order – ${data.orderNumber} from ${data.requestorName}`, html)
}

export async function sendOrderSubmittedToRequestor(data: OrderEmailData) {
  const itemRows = data.items.map(item =>
    `<tr>
      <td style="padding:8px 14px;border-bottom:1px solid #f0ece6;font-size:14px;color:#2d2926;">${item.itemName}</td>
      <td style="padding:8px 14px;border-bottom:1px solid #f0ece6;font-size:14px;color:#2d2926;text-align:center;">${item.quantity}</td>
      <td style="padding:8px 14px;border-bottom:1px solid #f0ece6;font-size:14px;color:#2d2926;text-align:right;">$${(item.estimatedPrice * item.quantity).toFixed(2)}</td>
    </tr>`
  ).join('')

  const html = emailWrapper(`
    <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#1e3a2f;">Order Received</p>
    <p style="margin:0 0 24px;font-size:14px;color:#6b6057;">Hi ${data.requestorName}, your supply order has been submitted successfully.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f4;border:1px solid #e8e3db;border-radius:8px;margin-bottom:24px;">
      ${infoRow('Order Number', data.orderNumber)}
      ${infoRow('School / Site', data.schoolSite)}
      ${infoRow('Submitted', data.submittedAt)}
      ${infoRow('Est. Total', `$${data.totalEstimatedPrice.toFixed(2)}`)}
    </table>

    <p style="margin:0 0 10px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#8a7f74;">Items Ordered</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8e3db;border-radius:8px;margin-bottom:24px;overflow:hidden;">
      <thead>
        <tr style="background:#f0ece6;">
          <th style="padding:8px 14px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#8a7f74;">Item</th>
          <th style="padding:8px 14px;text-align:center;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#8a7f74;">Qty</th>
          <th style="padding:8px 14px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#8a7f74;">Total</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <p style="margin:0 0 24px;font-size:13px;color:#6b6057;">Our team will review your order and update the status. You will receive an email when the status changes.</p>

    ${ctaButton('Track Your Order', `${APP_URL}/dashboard/orders/${data.orderId}`)}
  `)

  await sendMail(data.requestorEmail, `Order Confirmed – ${data.orderNumber}`, html)
}

export async function sendOrderStatusChangedToRequestor(
  requestorEmail: string,
  requestorName: string,
  orderId: string,
  orderNumber: string,
  newStatus: string,
  notes?: string
) {
  const label = ORDER_STATUS_LABELS[newStatus] || newStatus
  const color = ORDER_STATUS_COLORS[newStatus] || '#0284c7'

  const html = emailWrapper(`
    <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#1e3a2f;">Order Status Updated</p>
    <p style="margin:0 0 24px;font-size:14px;color:#6b6057;">Hi ${requestorName}, your order status has been updated.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f4;border:1px solid #e8e3db;border-radius:8px;margin-bottom:24px;">
      ${infoRow('Order Number', orderNumber)}
      ${infoRow('New Status', statusBadge(label, color))}
      ${notes ? infoRow('Notes', notes) : ''}
    </table>

    ${notes ? `<div style="background:#f9f7f4;border-left:4px solid ${color};border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#4a4039;">${notes}</p>
    </div>` : ''}

    ${ctaButton('View Order Details', `${APP_URL}/dashboard/orders/${orderId}`)}
  `)

  await sendMail(requestorEmail, `Order Update – ${orderNumber} is now ${label}`, html)
}

// ---------------------------------------------------------------------------
// Referral emails
// ---------------------------------------------------------------------------

interface ReferralEmailData {
  referralId: string
  confirmationNumber: string
  studentName: string
  submitterEmail: string
  submitterName?: string
  formType?: string
  submittedAt?: string
}

export async function sendReferralSubmittedToStaff(recipients: string[], data: ReferralEmailData) {
  if (!recipients.length) return

  const formTypeLabel = data.formType === 'LEVEL_II' ? 'Level II' : data.formType === 'DHH_ITINERANT' ? 'DHH Itinerant' : 'Interim Placement'

  const html = emailWrapper(`
    <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#1e3a2f;">New Referral Submitted</p>
    <p style="margin:0 0 24px;font-size:14px;color:#6b6057;">A new special education referral has been submitted and requires review.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f4;border:1px solid #e8e3db;border-radius:8px;margin-bottom:24px;">
      ${infoRow('Confirmation #', data.confirmationNumber)}
      ${infoRow('Student Name', data.studentName)}
      ${infoRow('Form Type', formTypeLabel)}
      ${infoRow('Submitted By', data.submitterEmail)}
      ${data.submittedAt ? infoRow('Submitted', data.submittedAt) : ''}
    </table>

    ${ctaButton('Review Referral', `${APP_URL}/dashboard/referrals/${data.referralId}`)}
  `)

  await sendMail(recipients, `New Referral – ${data.studentName} (${data.confirmationNumber})`, html)
}

export async function sendReferralSubmissionEmail(
  email: string,
  studentName: string,
  confirmationNumber: string,
  referralId?: string
) {
  const html = emailWrapper(`
    <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#1e3a2f;">Referral Received</p>
    <p style="margin:0 0 24px;font-size:14px;color:#6b6057;">Your special education referral for <strong>${studentName}</strong> has been received successfully.</p>

    ${confirmationBadge(confirmationNumber)}

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f4;border:1px solid #e8e3db;border-radius:8px;margin-bottom:24px;">
      ${infoRow('Student', studentName)}
      ${infoRow('Status', statusBadge('Submitted', '#0284c7'))}
    </table>

    <p style="margin:0 0 8px;font-size:14px;color:#4a4039;">Our team will review the referral packet within <strong>5 business days</strong>. You will receive an email when the status changes.</p>
    <p style="margin:0 0 24px;font-size:14px;color:#4a4039;">Please save your confirmation number — you will need it to check the status of your referral.</p>

    ${referralId ? ctaButton('Check Referral Status', `${APP_URL}/referrals/${referralId}/confirmation`) : ''}
  `)

  await sendMail(email, `Referral Received – ${confirmationNumber}`, html)
}

export async function sendReferralStatusChangeEmail(
  email: string,
  studentName: string,
  confirmationNumber: string,
  newStatus: string,
  reason?: string,
  referralId?: string
) {
  const label = REFERRAL_STATUS_LABELS[newStatus] || newStatus.replace(/_/g, ' ')

  const statusColors: Record<string, string> = {
    UNDER_REVIEW: '#7c3aed',
    PENDING_DOCUMENTS: '#d97706',
    APPROVED: '#059669',
    REJECTED: '#dc2626',
    WAITLISTED: '#0284c7',
    ENROLLED: '#059669',
    WITHDRAWN: '#6b7280',
  }
  const color = statusColors[newStatus] || '#0284c7'

  const html = emailWrapper(`
    <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#1e3a2f;">Referral Status Updated</p>
    <p style="margin:0 0 24px;font-size:14px;color:#6b6057;">The status of your referral for <strong>${studentName}</strong> has been updated.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f4;border:1px solid #e8e3db;border-radius:8px;margin-bottom:24px;">
      ${infoRow('Confirmation #', confirmationNumber)}
      ${infoRow('Student', studentName)}
      ${infoRow('New Status', statusBadge(label, color))}
    </table>

    ${reason ? `<div style="background:#f9f7f4;border-left:4px solid ${color};border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#8a7f74;">Notes</p>
      <p style="margin:0;font-size:14px;color:#4a4039;">${reason}</p>
    </div>` : ''}

    ${referralId ? ctaButton('View Referral Details', `${APP_URL}/referrals/${referralId}/confirmation`) : ''}
  `)

  await sendMail(email, `Referral Update – ${confirmationNumber} is now ${label}`, html)
}

// ---------------------------------------------------------------------------
// User onboarding emails
// ---------------------------------------------------------------------------

const USER_ROLE_LABELS: Record<string, string> = {
  EXTERNAL_ORG: 'External Organization',
  TEACHER: 'Teacher',
  SPED_STAFF: 'SPED Staff',
  ADMIN: 'Administrator',
  SUPER_ADMIN: 'Super Administrator',
}

interface UserAccessEmailData {
  recipientName: string
  recipientEmail: string
  role: string
  actionLink: string
  sentByName?: string | null
}

export async function sendUserInvitationEmail(data: UserAccessEmailData) {
  const safeName = escapeHtml(data.recipientName)
  const safeEmail = escapeHtml(data.recipientEmail)
  const safeRole = escapeHtml(USER_ROLE_LABELS[data.role] || data.role)
  const safeSignInUrl = escapeHtml(SIGN_IN_URL)
  const inviterLine = data.sentByName
    ? `<p style="margin:0 0 18px;font-size:14px;color:#6b6057;"><strong>${escapeHtml(data.sentByName)}</strong> created your account.</p>`
    : ''

  const html = emailWrapper(`
    <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#1e3a2f;">You&apos;re Invited</p>
    <p style="margin:0 0 18px;font-size:14px;color:#6b6057;">Hi ${safeName}, you now have access to the SCSOS Special Education portal.</p>
    ${inviterLine}

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f4;border:1px solid #e8e3db;border-radius:8px;margin-bottom:24px;">
      ${infoRow('Account Email', safeEmail)}
      ${infoRow('Assigned Role', safeRole)}
      ${infoRow('Sign-In Page', safeSignInUrl)}
    </table>

    <p style="margin:0 0 10px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#8a7f74;">Next Steps</p>
    <ol style="margin:0 0 24px;padding-left:20px;color:#4a4039;font-size:14px;line-height:1.7;">
      <li>Use the button below to set your password.</li>
      <li>Sign in with your account email at the portal login page.</li>
      <li>After signing in, open your dashboard to begin submitting and tracking work.</li>
    </ol>

    ${ctaButton('Set Password & Access Portal', data.actionLink)}

    <p style="margin:14px 0 0;font-size:12px;color:#8a7f74;word-break:break-all;">If the button does not open, paste this URL into your browser:<br />${escapeHtml(data.actionLink)}</p>
  `)

  await sendMail(data.recipientEmail, 'Set up your SCSOS Special Education account', html)
}

export async function sendUserPasswordResetEmail(data: UserAccessEmailData) {
  const safeName = escapeHtml(data.recipientName)
  const safeEmail = escapeHtml(data.recipientEmail)
  const safeRole = escapeHtml(USER_ROLE_LABELS[data.role] || data.role)

  const html = emailWrapper(`
    <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#1e3a2f;">Password Reset Requested</p>
    <p style="margin:0 0 18px;font-size:14px;color:#6b6057;">Hi ${safeName}, a password reset link was requested for your SCSOS Special Education account.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f4;border:1px solid #e8e3db;border-radius:8px;margin-bottom:24px;">
      ${infoRow('Account Email', safeEmail)}
      ${infoRow('Assigned Role', safeRole)}
      ${infoRow('Sign-In Page', escapeHtml(SIGN_IN_URL))}
    </table>

    <p style="margin:0 0 18px;font-size:14px;color:#4a4039;">Use the button below to choose a new password. For security, this link should be used promptly.</p>

    ${ctaButton('Reset Password', data.actionLink)}

    <p style="margin:14px 0 0;font-size:12px;color:#8a7f74;word-break:break-all;">If the button does not open, paste this URL into your browser:<br />${escapeHtml(data.actionLink)}</p>
  `)

  await sendMail(data.recipientEmail, 'Reset your SCSOS Special Education password', html)
}

// ---------------------------------------------------------------------------
// Settings helper — load notify emails from DB
// ---------------------------------------------------------------------------

export async function getEmailSettings(): Promise<{ orderNotifyEmails: string[]; referralNotifyEmails: string[] }> {
  try {
    const { prisma } = await import('@/lib/prisma')
    const settings = await prisma.emailSettings.findFirst()
    return {
      orderNotifyEmails: settings?.orderNotifyEmails ?? [],
      referralNotifyEmails: settings?.referralNotifyEmails ?? [],
    }
  } catch {
    return { orderNotifyEmails: [], referralNotifyEmails: [] }
  }
}
