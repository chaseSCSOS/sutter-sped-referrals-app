import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'

export default async function ReferralConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const referral = await prisma.referral.findUnique({
    where: { id },
    select: {
      id: true,
      confirmationNumber: true,
      studentName: true,
      submittedAt: true,
      deadlineDate: true,
      grade: true,
      placementType: true,
    },
  })

  if (!referral) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full">
        {/* Success Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-sage-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-sage-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-cream-200 overflow-hidden">
          <div className="px-8 pt-8 pb-6 text-center">
            <h1 className="text-2xl font-bold text-warm-gray-900 mb-2">
              Referral Submitted Successfully
            </h1>
            <p className="text-warm-gray-600 text-sm">
              Your interim placement referral has been received and is being processed.
            </p>
          </div>

          {/* Confirmation Number */}
          <div className="mx-8 mb-6 bg-sky-50 border border-sky-200 rounded-xl p-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-600 mb-1">
              Confirmation Number
            </p>
            <p className="text-2xl font-bold text-sky-900 font-mono tracking-wide">
              {referral.confirmationNumber}
            </p>
            <p className="text-xs text-sky-600 mt-2">
              Save this number to check your referral status at any time.
            </p>
          </div>

          {/* Referral Details */}
          <div className="mx-8 mb-6 space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-cream-100">
              <span className="text-sm text-warm-gray-500">Student</span>
              <span className="text-sm font-medium text-warm-gray-900">{referral.studentName}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-cream-100">
              <span className="text-sm text-warm-gray-500">Grade</span>
              <span className="text-sm font-medium text-warm-gray-900">{referral.grade}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-cream-100">
              <span className="text-sm text-warm-gray-500">Placement Type</span>
              <span className="text-sm font-medium text-warm-gray-900">{referral.placementType}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-cream-100">
              <span className="text-sm text-warm-gray-500">Submitted</span>
              <span className="text-sm font-medium text-warm-gray-900">
                {format(new Date(referral.submittedAt), 'MMM d, yyyy \'at\' h:mm a')}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-warm-gray-500">Review Deadline</span>
              <span className="text-sm font-medium text-warm-gray-900">
                {format(new Date(referral.deadlineDate), 'MMM d, yyyy')}
              </span>
            </div>
          </div>

          {/* Next Steps */}
          <div className="mx-8 mb-8 bg-cream-50 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-warm-gray-900 mb-3">What Happens Next</h3>
            <ol className="space-y-2 text-sm text-warm-gray-600">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center">1</span>
                <span>Our team will review your referral packet within 5 business days.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center">2</span>
                <span>If any documents are missing, you&apos;ll be notified to upload replacements.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center">3</span>
                <span>Once approved, placement coordination will begin immediately.</span>
              </li>
            </ol>
          </div>

          {/* Actions */}
          <div className="px-8 pb-8 flex flex-col sm:flex-row gap-3">
            <Link
              href={`/referrals/status?confirmation=${referral.confirmationNumber}`}
              className="flex-1 text-center bg-sky-600 text-white px-5 py-3 rounded-xl font-medium hover:bg-sky-700 transition-colors text-sm"
            >
              Check Referral Status
            </Link>
            <Link
              href="/interim-referral-form"
              className="flex-1 text-center bg-white text-warm-gray-700 px-5 py-3 rounded-xl font-medium border border-cream-200 hover:bg-cream-50 transition-colors text-sm"
            >
              Submit Another Referral
            </Link>
          </div>
        </div>

        {/* Footer Link */}
        <div className="text-center mt-6">
          <Link href="/" className="text-sm text-warm-gray-500 hover:text-sky-600 transition-colors">
            ← Return to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
