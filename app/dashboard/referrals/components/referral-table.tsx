'use client'

import { useState } from 'react'
import Link from 'next/link'
import StatusBadge from './status-badge'
import { formatDistanceToNow } from 'date-fns'
import EditReferralModal from './edit-referral-modal'

interface ReferralTableProps {
  referrals: any[]
  preset?: string
  showSyncColumns?: boolean
  isStaff?: boolean
  onRefresh?: () => void
}

function CumStatusBadge({ referral }: { referral: any }) {
  if (referral.cumSentDate) return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full"><span className="w-1 h-1 rounded-full bg-emerald-500 inline-block" />Sent</span>
  if (referral.cumReceivedDate) return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded-full"><span className="w-1 h-1 rounded-full bg-sky-500 inline-block" />Received</span>
  if (referral.cumRequestedDate) return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full"><span className="w-1 h-1 rounded-full bg-amber-500 inline-block" />Requested</span>
  return <span className="text-[10px] text-warm-gray-400">—</span>
}

function DeadlineCell({ deadlineDate }: { deadlineDate: any }) {
  const daysUntil = Math.ceil((new Date(deadlineDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  const isPast = daysUntil < 0
  const isUrgent = daysUntil >= 0 && daysUntil <= 7
  return (
    <div>
      <div className={`text-sm font-medium ${
        isPast ? 'text-red-600' : isUrgent ? 'text-amber-600' : 'text-warm-gray-700'
      }`}>
        {new Date(deadlineDate).toLocaleDateString()}
      </div>
      <div className={`text-[10px] font-medium mt-0.5 ${
        isPast ? 'text-red-500' : isUrgent ? 'text-amber-500' : 'text-warm-gray-400'
      }`}>
        {isPast ? `${Math.abs(daysUntil)}d overdue` : `${daysUntil}d left`}
      </div>
    </div>
  )
}

export default function ReferralTable({ referrals, preset, showSyncColumns = false, isStaff = false, onRefresh }: ReferralTableProps) {
  const [editingReferral, setEditingReferral] = useState<any>(null)

  // Columns shown depend on which tab is active
  const isAll = !preset || preset === 'ALL'
  const isScipVip = preset === 'SCIP' || preset === 'VIP'
  const isDhh = preset === 'DHH'
  const showTeacher = preset === 'GENERAL' || preset === 'BEHAVIOR' || isAll
  const showDor = isStaff
  const showCum = isStaff && (isAll || preset === 'GENERAL' || preset === 'BEHAVIOR')
  const showReferring = isStaff && (isScipVip || isDhh || isAll)
  const showProvider = isStaff && (preset === 'VIP' || isAll)

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden"
           style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
        {/* Sticky horizontal scroll container */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: isAll ? '900px' : '700px' }}>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {/* Sticky student name column */}
                <th className="sticky left-0 z-10 bg-slate-50 px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                    style={{ minWidth: '200px' }}>
                  Student
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Grade</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Ref. Date</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Deadline</th>
                {isAll && (
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Track</th>
                )}
                {showTeacher && (
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Teacher</th>
                )}
                {showDor && (
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">DOR</th>
                )}
                {showCum && (
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">CUM</th>
                )}
                {showReferring && (
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Referring Party</th>
                )}
                {showProvider && (
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Provider</th>
                )}
                {showSyncColumns && (
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">SEIS / Aeries</th>
                )}
                {isStaff && (
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Silo</th>
                )}
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {referrals.map((referral, index) => {
                const daysUntil = Math.ceil((new Date(referral.deadlineDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                const isPast = daysUntil < 0
                const isUrgent = daysUntil >= 0 && daysUntil <= 7
                const rowAccent = isPast ? 'border-l-2 border-l-red-400' : isUrgent ? 'border-l-2 border-l-amber-400' : ''

                return (
                  <tr
                    key={referral.id}
                    className={`group hover:bg-sky-50/40 transition-colors cursor-pointer ${rowAccent}`}
                    onClick={() => isStaff && setEditingReferral(referral)}
                  >
                    {/* Sticky student column */}
                    <td className="sticky left-0 z-10 bg-white group-hover:bg-sky-50/40 px-4 py-3 whitespace-nowrap transition-colors">
                      <div className="font-medium text-slate-800 text-sm">{referral.studentName}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        DOB {new Date(referral.dateOfBirth).toLocaleDateString()}
                      </div>
                    </td>

                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-sm text-slate-600">{referral.grade || '—'}</span>
                    </td>

                    <td className="px-3 py-3 whitespace-nowrap">
                      <StatusBadge status={referral.status} />
                    </td>

                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-sm text-slate-600">
                        {new Date(referral.submittedAt).toLocaleDateString()}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {formatDistanceToNow(new Date(referral.submittedAt), { addSuffix: true })}
                      </div>
                    </td>

                    <td className="px-3 py-3 whitespace-nowrap">
                      <DeadlineCell deadlineDate={referral.deadlineDate} />
                    </td>

                    {isAll && (
                      <td className="px-3 py-3 whitespace-nowrap">
                        <TrackPill track={referral.programTrack} />
                      </td>
                    )}

                    {showTeacher && (
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="text-sm text-slate-600 max-w-[140px] truncate block">{referral.classroomTeacher || '—'}</span>
                      </td>
                    )}

                    {showDor && (
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="text-xs text-slate-600">{referral.districtOfResidence || '—'}</span>
                      </td>
                    )}

                    {showCum && (
                      <td className="px-3 py-3 whitespace-nowrap">
                        <CumStatusBadge referral={referral} />
                      </td>
                    )}

                    {showReferring && (
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="text-xs text-slate-600 max-w-[120px] truncate block">{referral.referringParty || '—'}</span>
                      </td>
                    )}

                    {showProvider && (
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="text-xs text-slate-600">{referral.serviceProvider || '—'}</span>
                      </td>
                    )}

                    {showSyncColumns && (
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
                            referral.inSEIS
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-50 text-slate-400 border-slate-200'
                          }`}>SEIS</span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
                            referral.inAeries
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-50 text-slate-400 border-slate-200'
                          }`}>Aeries</span>
                        </div>
                      </td>
                    )}

                    {isStaff && (
                      <td className="px-3 py-3 whitespace-nowrap">
                        {referral.silo ? (
                          <SiloPill silo={referral.silo} />
                        ) : <span className="text-slate-400 text-xs">—</span>}
                      </td>
                    )}

                    <td className="px-3 py-3 whitespace-nowrap text-right pr-4">
                      <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isStaff && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingReferral(referral) }}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-sky-700 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>
                        )}
                        <Link
                          href={`/dashboard/referrals/${referral.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editingReferral && (
        <EditReferralModal
          referral={editingReferral}
          open={!!editingReferral}
          onClose={() => {
            setEditingReferral(null)
            onRefresh?.()
          }}
        />
      )}
    </>
  )
}

function TrackPill({ track }: { track: string }) {
  const colors: Record<string, string> = {
    GENERAL: 'bg-sky-50 text-sky-700 border-sky-200',
    BEHAVIOR: 'bg-orange-50 text-orange-700 border-orange-200',
    DHH: 'bg-violet-50 text-violet-700 border-violet-200',
    SCIP: 'bg-teal-50 text-teal-700 border-teal-200',
    VIP: 'bg-pink-50 text-pink-700 border-pink-200',
  }
  const labels: Record<string, string> = {
    GENERAL: 'General',
    BEHAVIOR: 'BX',
    DHH: 'DHH',
    SCIP: 'SCIP',
    VIP: 'VIP',
  }
  const cls = colors[track] || 'bg-slate-50 text-slate-600 border-slate-200'
  return (
    <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded border ${cls}`}>
      {labels[track] || track}
    </span>
  )
}

function SiloPill({ silo }: { silo: string }) {
  const colors: Record<string, string> = {
    ASD: 'bg-blue-50 text-blue-700 border-blue-200',
    SD:  'bg-indigo-50 text-indigo-700 border-indigo-200',
    NC:  'bg-cyan-50 text-cyan-700 border-cyan-200',
    DHH: 'bg-violet-50 text-violet-700 border-violet-200',
    MD:  'bg-rose-50 text-rose-700 border-rose-200',
    OT:  'bg-amber-50 text-amber-700 border-amber-200',
  }
  const cls = colors[silo] || 'bg-slate-50 text-slate-600 border-slate-200'
  return (
    <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded border ${cls}`}>
      {silo}
    </span>
  )
}
