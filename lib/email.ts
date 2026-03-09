import { ConfidentialClientApplication } from '@azure/msal-node'

const TENANT_ID = process.env.AZURE_TENANT_ID!
const CLIENT_ID = process.env.AZURE_CLIENT_ID!
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET!
const MAIL_FROM = process.env.MAIL_FROM!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

type EmailTemplateDelivery = 'live' | 'manual' | 'template_only'

export interface SystemEmailTemplatePreview {
  id: string
  category: 'Orders' | 'Referrals' | 'Users' | 'Workflow'
  name: string
  audience: string
  trigger: string
  description: string
  delivery: EmailTemplateDelivery
  subject: string
  html: string
}

interface EmailTemplateContent {
  subject: string
  html: string
}

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

interface ReferralEmailData {
  referralId: string
  confirmationNumber: string
  studentName: string
  submitterEmail: string
  submitterName?: string
  formType?: string
  submittedAt?: string
}

interface UserAccessEmailData {
  recipientName: string
  recipientEmail: string
  role: string
  roleLabel?: string | null
  actionLink: string
  sentByName?: string | null
}

interface CumReferralData {
  id: string
  studentName: string
  dateOfBirth: Date | string
  lastPlacementSchool?: string | null
  lastPlacementDistrict?: string | null
  confirmationNumber: string
}

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

const ORDER_STATUS_META = {
  NEW: { label: 'Submitted', color: '#0284c7' },
  SHIPPED: { label: 'Placed', color: '#7c3aed' },
  RECEIVED: { label: 'Ready for Pickup', color: '#d97706' },
  COMPLETED: { label: 'Completed', color: '#059669' },
  CANCELLED: { label: 'Cancelled', color: '#dc2626' },
} as const

const REFERRAL_STATUS_META = {
  SUBMITTED: { label: 'Submitted', color: '#0284c7' },
  UNDER_REVIEW: { label: 'Under Review', color: '#7c3aed' },
  MISSING_DOCUMENTS: { label: 'Missing Documents', color: '#d97706' },
  PENDING_ADDITIONAL_INFO: { label: 'Pending Additional Info', color: '#d97706' },
  PENDING_APPROVAL: { label: 'Pending Approval', color: '#0284c7' },
  APPROVED: { label: 'Approved', color: '#059669' },
  ACCEPTED_AWAITING_PLACEMENT: { label: 'Accepted - Awaiting Placement', color: '#059669' },
  REJECTED: { label: 'Rejected', color: '#dc2626' },
  ON_HOLD: { label: 'On Hold', color: '#6b7280' },
  COMPLETED: { label: 'Completed', color: '#059669' },
  NOT_ENROLLING: { label: 'Not Enrolling', color: '#6b7280' },
  WITHDRAWN: { label: 'Withdrawn', color: '#6b7280' },
} as const

const USER_ROLE_LABELS: Record<string, string> = {
  EXTERNAL_ORG: 'External Organization',
  TEACHER: 'Teacher',
  SPED_STAFF: 'SPED Staff',
  ADMIN: 'Administrator',
  SUPER_ADMIN: 'Super Administrator',
}

function humanizeConstant(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function getOrderStatusMeta(status: string) {
  return ORDER_STATUS_META[status as keyof typeof ORDER_STATUS_META] ?? {
    label: humanizeConstant(status),
    color: '#0284c7',
  }
}

function getReferralStatusMeta(status: string) {
  return REFERRAL_STATUS_META[status as keyof typeof REFERRAL_STATUS_META] ?? {
    label: humanizeConstant(status),
    color: '#0284c7',
  }
}

function formatFormTypeLabel(formType?: string) {
  if (formType === 'LEVEL_II') return 'Level II'
  if (formType === 'DHH_ITINERANT') return 'DHH Itinerant'
  return 'Interim Placement'
}

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
          <tr>
            <td style="background:#1e3a2f;border-radius:12px 12px 0 0;padding:28px 36px;">
              <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#a8c4b0;">SCSOS</p>
              <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#ffffff;">Special Education Department</p>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:36px 36px 28px;border-left:1px solid #e8e3db;border-right:1px solid #e8e3db;">
              ${content}
            </td>
          </tr>
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

function buildOrderSubmittedToStaffEmail(data: OrderEmailData): EmailTemplateContent {
  const safeOrderNumber = escapeHtml(data.orderNumber)
  const safeRequestorName = escapeHtml(data.requestorName)
  const safeRequestorEmail = escapeHtml(data.requestorEmail)
  const safeSubmittedAt = escapeHtml(data.submittedAt)
  const itemRows = data.items.map(item =>
    `<tr>
      <td style="padding:8px 14px;border-bottom:1px solid #f0ece6;font-size:14px;color:#2d2926;">${escapeHtml(item.itemName)}</td>
      <td style="padding:8px 14px;border-bottom:1px solid #f0ece6;font-size:14px;color:#2d2926;text-align:center;">${item.quantity}</td>
      <td style="padding:8px 14px;border-bottom:1px solid #f0ece6;font-size:14px;color:#2d2926;text-align:right;">$${(item.estimatedPrice * item.quantity).toFixed(2)}</td>
    </tr>`
  ).join('')

  return {
    subject: `New Order – ${data.orderNumber} from ${data.requestorName}`,
    html: emailWrapper(`
      <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#1e3a2f;">New Order Submitted</p>
      <p style="margin:0 0 24px;font-size:14px;color:#6b6057;">A new supply order requires your attention.</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f4;border:1px solid #e8e3db;border-radius:8px;margin-bottom:24px;">
        ${infoRow('Order Number', safeOrderNumber)}
        ${infoRow('Requestor', `${safeRequestorName} &lt;${safeRequestorEmail}&gt;`)}
        ${infoRow('School / Site', escapeHtml(data.schoolSite))}
        ${infoRow('Submitted', safeSubmittedAt)}
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
    `),
  }
}

function buildOrderSubmittedToRequestorEmail(data: OrderEmailData): EmailTemplateContent {
  const safeRequestorName = escapeHtml(data.requestorName)
  const safeOrderNumber = escapeHtml(data.orderNumber)
  const safeSubmittedAt = escapeHtml(data.submittedAt)
  const itemRows = data.items.map(item =>
    `<tr>
      <td style="padding:8px 14px;border-bottom:1px solid #f0ece6;font-size:14px;color:#2d2926;">${escapeHtml(item.itemName)}</td>
      <td style="padding:8px 14px;border-bottom:1px solid #f0ece6;font-size:14px;color:#2d2926;text-align:center;">${item.quantity}</td>
      <td style="padding:8px 14px;border-bottom:1px solid #f0ece6;font-size:14px;color:#2d2926;text-align:right;">$${(item.estimatedPrice * item.quantity).toFixed(2)}</td>
    </tr>`
  ).join('')

  return {
    subject: `Order Confirmed – ${data.orderNumber}`,
    html: emailWrapper(`
      <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#1e3a2f;">Order Received</p>
      <p style="margin:0 0 24px;font-size:14px;color:#6b6057;">Hi ${safeRequestorName}, your supply order has been submitted successfully.</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f4;border:1px solid #e8e3db;border-radius:8px;margin-bottom:24px;">
        ${infoRow('Order Number', safeOrderNumber)}
        ${infoRow('School / Site', escapeHtml(data.schoolSite))}
        ${infoRow('Submitted', safeSubmittedAt)}
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
    `),
  }
}

function buildOrderStatusChangedToRequestorEmail(
  requestorName: string,
  orderId: string,
  orderNumber: string,
  newStatus: string,
  notes?: string
): EmailTemplateContent {
  const { label, color } = getOrderStatusMeta(newStatus)
  const safeRequestorName = escapeHtml(requestorName)
  const safeOrderNumber = escapeHtml(orderNumber)
  const safeNotes = notes ? escapeHtml(notes) : ''

  return {
    subject: `Order Update – ${orderNumber} is now ${label}`,
    html: emailWrapper(`
      <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#1e3a2f;">Order Status Updated</p>
      <p style="margin:0 0 24px;font-size:14px;color:#6b6057;">Hi ${safeRequestorName}, your order status has been updated.</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f4;border:1px solid #e8e3db;border-radius:8px;margin-bottom:24px;">
        ${infoRow('Order Number', safeOrderNumber)}
        ${infoRow('New Status', statusBadge(label, color))}
        ${safeNotes ? infoRow('Notes', safeNotes) : ''}
      </table>

      ${safeNotes ? `<div style="background:#f9f7f4;border-left:4px solid ${color};border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:24px;">
        <p style="margin:0;font-size:13px;color:#4a4039;">${safeNotes}</p>
      </div>` : ''}

      ${ctaButton('View Order Details', `${APP_URL}/dashboard/orders/${orderId}`)}
    `),
  }
}

function buildReferralSubmittedToStaffEmail(data: ReferralEmailData): EmailTemplateContent {
  const safeConfirmationNumber = escapeHtml(data.confirmationNumber)
  const safeStudentName = escapeHtml(data.studentName)
  const safeSubmitterEmail = escapeHtml(data.submitterEmail)

  return {
    subject: `New Referral – ${data.studentName} (${data.confirmationNumber})`,
    html: emailWrapper(`
      <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#1e3a2f;">New Referral Submitted</p>
      <p style="margin:0 0 24px;font-size:14px;color:#6b6057;">A new special education referral has been submitted and requires review.</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f4;border:1px solid #e8e3db;border-radius:8px;margin-bottom:24px;">
        ${infoRow('Confirmation #', safeConfirmationNumber)}
        ${infoRow('Student Name', safeStudentName)}
        ${infoRow('Form Type', escapeHtml(formatFormTypeLabel(data.formType)))}
        ${infoRow('Submitted By', safeSubmitterEmail)}
        ${data.submittedAt ? infoRow('Submitted', escapeHtml(data.submittedAt)) : ''}
      </table>

      ${ctaButton('Review Referral', `${APP_URL}/dashboard/referrals/${data.referralId}`)}
    `),
  }
}

function buildReferralSubmissionEmail(
  studentName: string,
  confirmationNumber: string,
  referralId?: string
): EmailTemplateContent {
  const safeStudentName = escapeHtml(studentName)
  const safeConfirmationNumber = escapeHtml(confirmationNumber)

  return {
    subject: `Referral Received – ${confirmationNumber}`,
    html: emailWrapper(`
      <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#1e3a2f;">Referral Received</p>
      <p style="margin:0 0 24px;font-size:14px;color:#6b6057;">Your special education referral for <strong>${safeStudentName}</strong> has been received successfully.</p>

      ${confirmationBadge(safeConfirmationNumber)}

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f4;border:1px solid #e8e3db;border-radius:8px;margin-bottom:24px;">
        ${infoRow('Student', safeStudentName)}
        ${infoRow('Status', statusBadge('Submitted', '#0284c7'))}
      </table>

      <p style="margin:0 0 8px;font-size:14px;color:#4a4039;">Our team will review the referral packet within <strong>5 business days</strong>. You will receive an email when the status changes.</p>
      <p style="margin:0 0 24px;font-size:14px;color:#4a4039;">Please save your confirmation number — you will need it to check the status of your referral.</p>

      ${referralId ? ctaButton('Check Referral Status', `${APP_URL}/referrals/${referralId}/confirmation`) : ''}
    `),
  }
}

function buildReferralStatusChangeEmail(
  studentName: string,
  confirmationNumber: string,
  newStatus: string,
  reason?: string,
  referralId?: string
): EmailTemplateContent {
  const { label, color } = getReferralStatusMeta(newStatus)
  const safeStudentName = escapeHtml(studentName)
  const safeConfirmationNumber = escapeHtml(confirmationNumber)
  const safeReason = reason ? escapeHtml(reason) : ''

  return {
    subject: `Referral Update – ${confirmationNumber} is now ${label}`,
    html: emailWrapper(`
      <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#1e3a2f;">Referral Status Updated</p>
      <p style="margin:0 0 24px;font-size:14px;color:#6b6057;">The status of your referral for <strong>${safeStudentName}</strong> has been updated.</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f4;border:1px solid #e8e3db;border-radius:8px;margin-bottom:24px;">
        ${infoRow('Confirmation #', safeConfirmationNumber)}
        ${infoRow('Student', safeStudentName)}
        ${infoRow('New Status', statusBadge(label, color))}
      </table>

      ${safeReason ? `<div style="background:#f9f7f4;border-left:4px solid ${color};border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:24px;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#8a7f74;">Notes</p>
        <p style="margin:0;font-size:14px;color:#4a4039;">${safeReason}</p>
      </div>` : ''}

      ${referralId ? ctaButton('View Referral Details', `${APP_URL}/referrals/${referralId}/confirmation`) : ''}
    `),
  }
}

function buildUserInvitationEmailTemplate(data: UserAccessEmailData): EmailTemplateContent {
  const safeName = escapeHtml(data.recipientName)
  const safeEmail = escapeHtml(data.recipientEmail)
  const safeRole = escapeHtml(data.roleLabel || USER_ROLE_LABELS[data.role] || data.role)
  const safeSignInUrl = escapeHtml(SIGN_IN_URL)
  const safeActionLink = escapeHtml(data.actionLink)
  const inviterLine = data.sentByName
    ? `<p style="margin:0 0 18px;font-size:14px;color:#6b6057;"><strong>${escapeHtml(data.sentByName)}</strong> created your account.</p>`
    : ''

  return {
    subject: 'Set up your SCSOS Special Education account',
    html: emailWrapper(`
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

      <p style="margin:14px 0 0;font-size:12px;color:#8a7f74;word-break:break-all;">If the button does not open, paste this URL into your browser:<br />${safeActionLink}</p>
    `),
  }
}

function buildUserPasswordResetEmailTemplate(data: UserAccessEmailData): EmailTemplateContent {
  const safeName = escapeHtml(data.recipientName)
  const safeEmail = escapeHtml(data.recipientEmail)
  const safeRole = escapeHtml(data.roleLabel || USER_ROLE_LABELS[data.role] || data.role)
  const safeActionLink = escapeHtml(data.actionLink)

  return {
    subject: 'Reset your SCSOS Special Education password',
    html: emailWrapper(`
      <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#1e3a2f;">Password Reset Requested</p>
      <p style="margin:0 0 18px;font-size:14px;color:#6b6057;">Hi ${safeName}, a password reset link was requested for your SCSOS Special Education account.</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f4;border:1px solid #e8e3db;border-radius:8px;margin-bottom:24px;">
        ${infoRow('Account Email', safeEmail)}
        ${infoRow('Assigned Role', safeRole)}
        ${infoRow('Sign-In Page', escapeHtml(SIGN_IN_URL))}
      </table>

      <p style="margin:0 0 18px;font-size:14px;color:#4a4039;">Use the button below to choose a new password. For security, this link should be used promptly.</p>

      ${ctaButton('Reset Password', data.actionLink)}

      <p style="margin:14px 0 0;font-size:12px;color:#8a7f74;word-break:break-all;">If the button does not open, paste this URL into your browser:<br />${safeActionLink}</p>
    `),
  }
}

export function buildCumRequestEmailDraft(referral: CumReferralData): Record<string, string> {
  const school = referral.lastPlacementSchool || '[UNKNOWN SCHOOL]'
  const district = referral.lastPlacementDistrict || '[UNKNOWN DISTRICT]'
  const dob = new Date(referral.dateOfBirth as string).toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  })

  const subject = `CUM Record Request — ${referral.studentName}`
  const body = `Dear Records Department,

This letter is to request the Cumulative (CUM) records for the following student who is transferring to Sutter County Superintendent of Schools (SCSOS) Special Education program:

Student Name: ${referral.studentName}
Date of Birth: ${dob}
Previous School: ${school}
Previous District: ${district}

Please forward all available CUM records, including academic records, IEP documents, assessment reports, and any other relevant educational history, to:

Sutter County Superintendent of Schools
Special Education Department
970 Klamath Lane
Yuba City, CA 95993

If you have any questions, please contact our office.

Thank you for your prompt assistance.

SCSOS Special Education Department`

  return { subject, body, toSchool: school, toDistrict: district }
}

function buildCumRequestEmailTemplate(
  subject: string,
  body: string,
  referralId: string
): EmailTemplateContent {
  return {
    subject,
    html: emailWrapper(`
      <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#1e3a2f;">CUM Record Request</p>
      <p style="margin:0 0 24px;font-size:14px;color:#6b6057;">The following CUM record request has been sent on behalf of SCSOS Special Education.</p>
      <div style="background:#f9f7f4;border:1px solid #e8e3db;border-radius:8px;padding:20px 24px;margin-bottom:24px;white-space:pre-wrap;font-size:14px;color:#2d2926;line-height:1.6;">${escapeHtml(body)}</div>
      ${ctaButton('View Referral', `${APP_URL}/dashboard/referrals/${referralId}`)}
    `),
  }
}

function buildSeisAeriesReminderEmail(
  referralId: string,
  studentName: string,
  confirmationNumber: string,
  missingItems: string[]
): EmailTemplateContent {
  const itemList = missingItems
    .map(item => `<li style="margin-bottom:4px;">${escapeHtml(item)}</li>`)
    .join('')

  return {
    subject: `Action Required: SEIS/Aeries Entry — ${studentName}`,
    html: emailWrapper(`
      <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#1e3a2f;">SEIS / Aeries Entry Reminder</p>
      <p style="margin:0 0 24px;font-size:14px;color:#6b6057;">A student requires entry into the following systems:</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f4;border:1px solid #e8e3db;border-radius:8px;margin-bottom:24px;">
        ${infoRow('Student', escapeHtml(studentName))}
        ${infoRow('Confirmation #', escapeHtml(confirmationNumber))}
      </table>
      <ul style="margin:0 0 24px;padding-left:20px;color:#4a4039;font-size:14px;">${itemList}</ul>
      ${ctaButton('Open Referral', `${APP_URL}/dashboard/referrals/${referralId}`)}
    `),
  }
}

function buildOverdueCumAlertEmail(
  referralId: string,
  studentName: string,
  confirmationNumber: string,
  requestedDate: Date,
  daysOverdue: number
): EmailTemplateContent {
  return {
    subject: `Overdue CUM Request — ${studentName} (${daysOverdue} days)`,
    html: emailWrapper(`
      <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#1e3a2f;">CUM Request Overdue</p>
      <p style="margin:0 0 24px;font-size:14px;color:#6b6057;">A CUM records request has not received a response.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;margin-bottom:24px;">
        ${infoRow('Student', escapeHtml(studentName))}
        ${infoRow('Confirmation #', escapeHtml(confirmationNumber))}
        ${infoRow('Requested On', escapeHtml(requestedDate.toLocaleDateString()))}
        ${infoRow('Days Overdue', String(daysOverdue))}
      </table>
      <p style="margin:0 0 24px;font-size:14px;color:#4a4039;">Please follow up with the previous school to obtain the CUM records.</p>
      ${ctaButton('View Referral', `${APP_URL}/dashboard/referrals/${referralId}`)}
    `),
  }
}

function buildDraftSavedEmailTemplate(
  draftNumber: string,
  formType: string,
  expiresAt: Date
): EmailTemplateContent {
  const formLabels: Record<string, string> = {
    INTERIM: 'Interim Referral',
    DHH_ITINERANT: 'DHH Itinerant Referral',
    LEVEL_II: 'Level II Referral',
  }
  const formLabel = formLabels[formType] || 'Referral'
  const expiryStr = expiresAt.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return {
    subject: `Draft Saved – ${draftNumber}`,
    html: emailWrapper(`
      <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#1e3a2f;">Draft Saved</p>
      <p style="margin:0 0 24px;font-size:14px;color:#6b6057;">Your <strong>${escapeHtml(formLabel)}</strong> draft has been saved. Use the number below to resume where you left off.</p>

      <div style="background:#f0f7f3;border:2px solid #2d6a4f;border-radius:10px;padding:16px 24px;text-align:center;margin:24px 0;">
        <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#2d6a4f;">Draft Number</p>
        <p style="margin:6px 0 0;font-size:28px;font-weight:800;letter-spacing:4px;color:#1e3a2f;font-family:monospace;">${escapeHtml(draftNumber)}</p>
        <p style="margin:6px 0 0;font-size:12px;color:#5a7a6a;">Keep this number — you will need it along with your email to resume</p>
      </div>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f4;border:1px solid #e8e3db;border-radius:8px;margin-bottom:24px;">
        ${infoRow('Form Type', escapeHtml(formLabel))}
        ${infoRow('Expires', escapeHtml(expiryStr))}
      </table>

      <p style="margin:0 0 8px;font-size:14px;color:#4a4039;">To resume your draft, visit the referral status page and select <strong>"Resume a Draft"</strong>. Enter your email address and the draft number above.</p>
      <p style="margin:0 0 24px;font-size:14px;color:#d97706;"><strong>Note:</strong> Any uploaded documents will need to be re-attached when you resume.</p>

      ${ctaButton('Resume Your Draft', `${APP_URL}/referrals/status`)}
    `),
  }
}

export async function sendOrderSubmittedToStaff(recipients: string[], data: OrderEmailData) {
  if (!recipients.length) return
  const { subject, html } = buildOrderSubmittedToStaffEmail(data)
  await sendMail(recipients, subject, html)
}

export async function sendOrderSubmittedToRequestor(data: OrderEmailData) {
  const { subject, html } = buildOrderSubmittedToRequestorEmail(data)
  await sendMail(data.requestorEmail, subject, html)
}

export async function sendOrderStatusChangedToRequestor(
  requestorEmail: string,
  requestorName: string,
  orderId: string,
  orderNumber: string,
  newStatus: string,
  notes?: string
) {
  const { subject, html } = buildOrderStatusChangedToRequestorEmail(
    requestorName,
    orderId,
    orderNumber,
    newStatus,
    notes
  )
  await sendMail(requestorEmail, subject, html)
}

export async function sendReferralSubmittedToStaff(recipients: string[], data: ReferralEmailData) {
  if (!recipients.length) return
  const { subject, html } = buildReferralSubmittedToStaffEmail(data)
  await sendMail(recipients, subject, html)
}

export async function sendReferralSubmissionEmail(
  email: string,
  studentName: string,
  confirmationNumber: string,
  referralId?: string
) {
  const { subject, html } = buildReferralSubmissionEmail(studentName, confirmationNumber, referralId)
  await sendMail(email, subject, html)
}

export async function sendReferralStatusChangeEmail(
  email: string,
  studentName: string,
  confirmationNumber: string,
  newStatus: string,
  reason?: string,
  referralId?: string
) {
  const { subject, html } = buildReferralStatusChangeEmail(
    studentName,
    confirmationNumber,
    newStatus,
    reason,
    referralId
  )
  await sendMail(email, subject, html)
}

export async function sendUserInvitationEmail(data: UserAccessEmailData) {
  const { subject, html } = buildUserInvitationEmailTemplate(data)
  await sendMail(data.recipientEmail, subject, html)
}

export async function sendUserPasswordResetEmail(data: UserAccessEmailData) {
  const { subject, html } = buildUserPasswordResetEmailTemplate(data)
  await sendMail(data.recipientEmail, subject, html)
}

export async function sendCumRequestEmail(
  to: string,
  subject: string,
  body: string,
  referralId: string
): Promise<void> {
  const template = buildCumRequestEmailTemplate(subject, body, referralId)
  await sendMail(to, template.subject, template.html)
}

export async function sendSeisAeriesReminder(
  to: string | string[],
  referralId: string,
  studentName: string,
  confirmationNumber: string,
  missingItems: string[]
): Promise<void> {
  const { subject, html } = buildSeisAeriesReminderEmail(
    referralId,
    studentName,
    confirmationNumber,
    missingItems
  )
  await sendMail(to, subject, html)
}

export async function sendOverdueCumAlert(
  to: string | string[],
  referralId: string,
  studentName: string,
  confirmationNumber: string,
  requestedDate: Date,
  daysOverdue: number
): Promise<void> {
  const { subject, html } = buildOverdueCumAlertEmail(
    referralId,
    studentName,
    confirmationNumber,
    requestedDate,
    daysOverdue
  )
  await sendMail(to, subject, html)
}

export async function sendDraftSavedEmail(
  email: string,
  draftNumber: string,
  formType: string,
  expiresAt: Date
) {
  const { subject, html } = buildDraftSavedEmailTemplate(draftNumber, formType, expiresAt)
  await sendMail(email, subject, html)
}

export function getSystemEmailTemplatePreviews(): SystemEmailTemplatePreview[] {
  const sampleOrder: OrderEmailData = {
    orderNumber: 'ORD-20260309-0142',
    orderId: 'sample-order-0142',
    requestorName: 'Jordan Lee',
    requestorEmail: 'jordan.lee@example.org',
    schoolSite: 'Riverbend Elementary',
    itemCount: 2,
    items: [
      { itemName: 'WJ-IV Achievement Kit', quantity: 1, estimatedPrice: 149.99 },
      { itemName: 'Scoring Protocol Pack', quantity: 2, estimatedPrice: 31.25 },
    ],
    totalEstimatedPrice: 212.49,
    submittedAt: 'March 9, 2026',
  }

  const sampleReferral: ReferralEmailData = {
    referralId: 'sample-referral-4821',
    confirmationNumber: 'REF-20260309-4821',
    studentName: 'Avery Martinez',
    submitterEmail: 'district.admin@example.org',
    formType: 'LEVEL_II',
    submittedAt: 'March 9, 2026',
  }

  const sampleInvite: UserAccessEmailData = {
    recipientName: 'Taylor Nguyen',
    recipientEmail: 'tnguyen@example.org',
    role: 'SPED_STAFF',
    roleLabel: 'Program Specialist',
    actionLink: `${APP_URL}/auth/callback?token=preview-link`,
    sentByName: 'Morgan Ruiz',
  }

  const sampleCumReferral: CumReferralData = {
    id: 'sample-referral-4821',
    studentName: 'Avery Martinez',
    dateOfBirth: '2015-08-14',
    lastPlacementSchool: 'Yuba Vista Elementary',
    lastPlacementDistrict: 'Yuba City USD',
    confirmationNumber: 'REF-20260309-4821',
  }

  const cumDraft = buildCumRequestEmailDraft(sampleCumReferral)
  const orderSubmittedStaff = buildOrderSubmittedToStaffEmail(sampleOrder)
  const orderSubmittedRequestor = buildOrderSubmittedToRequestorEmail(sampleOrder)
  const orderStatusUpdated = buildOrderStatusChangedToRequestorEmail(
    sampleOrder.requestorName,
    sampleOrder.orderId,
    sampleOrder.orderNumber,
    'RECEIVED',
    'Your materials are ready for pickup at the front office between 8:00 AM and 3:30 PM.'
  )
  const referralSubmittedStaff = buildReferralSubmittedToStaffEmail(sampleReferral)
  const referralSubmittedRequestor = buildReferralSubmissionEmail(
    sampleReferral.studentName,
    sampleReferral.confirmationNumber,
    sampleReferral.referralId
  )
  const referralStatusUpdated = buildReferralStatusChangeEmail(
    sampleReferral.studentName,
    sampleReferral.confirmationNumber,
    'MISSING_DOCUMENTS',
    'Please upload the current IEP and most recent psychoeducational report.',
    sampleReferral.referralId
  )
  const invitation = buildUserInvitationEmailTemplate(sampleInvite)
  const passwordReset = buildUserPasswordResetEmailTemplate({
    ...sampleInvite,
    sentByName: null,
  })
  const cumRequest = buildCumRequestEmailTemplate(
    cumDraft.subject,
    cumDraft.body,
    sampleCumReferral.id
  )
  const seisAeriesReminder = buildSeisAeriesReminderEmail(
    sampleCumReferral.id,
    sampleCumReferral.studentName,
    sampleCumReferral.confirmationNumber,
    ['SEIS entry pending', 'Aeries enrollment pending']
  )
  const overdueCumAlert = buildOverdueCumAlertEmail(
    sampleCumReferral.id,
    sampleCumReferral.studentName,
    sampleCumReferral.confirmationNumber,
    new Date('2026-02-24T12:00:00Z'),
    14
  )
  const draftSaved = buildDraftSavedEmailTemplate(
    'DFT-20260309-1042',
    'INTERIM',
    new Date('2026-04-08T12:00:00Z')
  )

  return [
    {
      id: 'order-submitted-admin',
      category: 'Orders',
      name: 'New Order Notification',
      audience: 'SPED staff / admins',
      trigger: 'Automatically sent when a new order is submitted.',
      description: 'Admin notification for new supply and protocol order requests.',
      delivery: 'live',
      subject: orderSubmittedStaff.subject,
      html: orderSubmittedStaff.html,
    },
    {
      id: 'order-submitted-requestor',
      category: 'Orders',
      name: 'Order Confirmation',
      audience: 'Order requestor',
      trigger: 'Automatically sent right after order submission.',
      description: 'Confirms the request and shows the ordered items.',
      delivery: 'live',
      subject: orderSubmittedRequestor.subject,
      html: orderSubmittedRequestor.html,
    },
    {
      id: 'order-status-update',
      category: 'Orders',
      name: 'Order Status Update',
      audience: 'Order requestor',
      trigger: 'Sent when staff changes the order status.',
      description: 'Used for placed, ready-for-pickup, completed, and cancelled updates.',
      delivery: 'live',
      subject: orderStatusUpdated.subject,
      html: orderStatusUpdated.html,
    },
    {
      id: 'referral-submitted-admin',
      category: 'Referrals',
      name: 'New Referral Notification',
      audience: 'SPED staff / admins',
      trigger: 'Automatically sent when a referral is submitted.',
      description: 'Alerts staff that a new referral packet is ready for review.',
      delivery: 'live',
      subject: referralSubmittedStaff.subject,
      html: referralSubmittedStaff.html,
    },
    {
      id: 'referral-submitted-requestor',
      category: 'Referrals',
      name: 'Referral Confirmation',
      audience: 'Referral submitter',
      trigger: 'Automatically sent right after referral submission.',
      description: 'Confirms receipt and highlights the referral confirmation number.',
      delivery: 'live',
      subject: referralSubmittedRequestor.subject,
      html: referralSubmittedRequestor.html,
    },
    {
      id: 'referral-status-update',
      category: 'Referrals',
      name: 'Referral Status Update',
      audience: 'Referral submitter',
      trigger: 'Sent when staff updates a referral status.',
      description: 'Shared template for referral workflow updates with optional notes.',
      delivery: 'live',
      subject: referralStatusUpdated.subject,
      html: referralStatusUpdated.html,
    },
    {
      id: 'user-invitation',
      category: 'Users',
      name: 'User Invitation',
      audience: 'New portal user',
      trigger: 'Sent when an admin creates or re-sends access for a user.',
      description: 'First-time account setup email with password creation link.',
      delivery: 'manual',
      subject: invitation.subject,
      html: invitation.html,
    },
    {
      id: 'user-password-reset',
      category: 'Users',
      name: 'Password Reset',
      audience: 'Existing portal user',
      trigger: 'Sent when an admin issues a reset password link.',
      description: 'Recovery email for existing user accounts.',
      delivery: 'manual',
      subject: passwordReset.subject,
      html: passwordReset.html,
    },
    {
      id: 'cum-record-request',
      category: 'Workflow',
      name: 'CUM Record Request',
      audience: 'Previous school / records office',
      trigger: 'Sent manually from the referral CUM workflow after staff review.',
      description: 'Standardized CUM request letter sent on behalf of SCSOS Special Education.',
      delivery: 'manual',
      subject: cumRequest.subject,
      html: cumRequest.html,
    },
    {
      id: 'seis-aeries-reminder',
      category: 'Workflow',
      name: 'SEIS / Aeries Reminder',
      audience: 'Assigned staff or referral notification recipients',
      trigger: 'Intended for overdue system entry follow-up.',
      description: 'Template exists, but I did not find a live scheduler or trigger for this reminder yet.',
      delivery: 'template_only',
      subject: seisAeriesReminder.subject,
      html: seisAeriesReminder.html,
    },
    {
      id: 'cum-overdue-alert',
      category: 'Workflow',
      name: 'Overdue CUM Alert',
      audience: 'Assigned staff or referral notification recipients',
      trigger: 'Intended for overdue CUM follow-up.',
      description: 'Template exists, but I did not find a live scheduler or trigger for this alert yet.',
      delivery: 'template_only',
      subject: overdueCumAlert.subject,
      html: overdueCumAlert.html,
    },
    {
      id: 'draft-saved',
      category: 'Referrals',
      name: 'Draft Saved Confirmation',
      audience: 'Referral submitter',
      trigger: 'Automatically sent when a referral draft is saved.',
      description: 'Includes the draft number and resume instructions.',
      delivery: 'live',
      subject: draftSaved.subject,
      html: draftSaved.html,
    },
  ]
}

export async function getEmailSettings(): Promise<{
  orderNotifyEmails: string[]
  referralNotifyEmails: string[]
  cumReminderDays: number
  seisAeriesReminderDays: number
}> {
  try {
    const { prisma } = await import('@/lib/prisma')
    const settings = await prisma.emailSettings.findFirst()
    return {
      orderNotifyEmails: settings?.orderNotifyEmails ?? [],
      referralNotifyEmails: settings?.referralNotifyEmails ?? [],
      cumReminderDays: settings?.cumReminderDays ?? 10,
      seisAeriesReminderDays: settings?.seisAeriesReminderDays ?? 5,
    }
  } catch {
    return {
      orderNotifyEmails: [],
      referralNotifyEmails: [],
      cumReminderDays: 10,
      seisAeriesReminderDays: 5,
    }
  }
}
