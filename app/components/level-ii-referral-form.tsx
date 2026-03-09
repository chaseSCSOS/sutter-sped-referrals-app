'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { levelIIReferralSchema, type LevelIIReferralFormData } from './level-ii-schema';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { toast } from 'sonner';
import SaveDraftDialog from './save-draft-dialog';

const PRESCHOOL_GRADES = new Set(['PreK', 'Preschool']);
const HIGH_SCHOOL_GRADES = new Set(['9', '10', '11', '12']);

function isPreschoolGrade(grade?: string) {
  return Boolean(grade) && PRESCHOOL_GRADES.has(grade!);
}

function isHighSchoolGrade(grade?: string) {
  return Boolean(grade) && HIGH_SCHOOL_GRADES.has(grade!);
}

type DocKey =
  | 'rationaleForReferral'
  | 'studentRegistration'
  | 'homeLanguageSurvey'
  | 'releaseOfInformation'
  | 'multiDisciplinaryReport'
  | 'behaviorAssessment'
  | 'interventionStrategies'
  | 'currentAcademicAssessment'
  | 'reportsOtherAgencies'
  | 'currentIEP'
  | 'currentBehaviorPlan'
  | 'iepDocumentation'
  | 'primaryModeOfLearning'
  | 'prescribedMedication'
  | 'immunizationRecord'
  | 'audiogramChart'
  | 'transcripts';

interface DocConfig {
  key: DocKey;
  label: string;
  description: string;
  conditional?: boolean;
}

const ALL_DOCS: DocConfig[] = [
  {
    key: 'rationaleForReferral',
    label: 'Rationale for Referral',
    description: 'Written summary of District Intervention including behavioral & academic accommodations.',
  },
  {
    key: 'studentRegistration',
    label: 'Student Registration Form',
    description: 'Aeries Demographics printout or current address information.',
  },
  {
    key: 'homeLanguageSurvey',
    label: 'Home Language Survey',
    description: 'Required for TK and above (not applicable for Preschool).',
    conditional: true,
  },
  {
    key: 'releaseOfInformation',
    label: 'Signed Authorization for Release of Information',
    description: 'Signed parent/guardian authorization for release of student records.',
  },
  {
    key: 'multiDisciplinaryReport',
    label: 'Current Multi-disciplinary Team Report',
    description: 'Completed within the last year; must include vision and hearing screenings.',
  },
  {
    key: 'behaviorAssessment',
    label: 'Behavior Assessment, BSP & BIP',
    description: 'Behavior Support Plan and Behavior Intervention Plan.',
  },
  {
    key: 'interventionStrategies',
    label: 'Intervention Strategies',
    description: 'Documentation of intervention strategies implemented prior to referral.',
  },
  {
    key: 'currentAcademicAssessment',
    label: 'Current Academic Assessment',
    description: 'Both standardized and non-standardized with current present levels of performance (within one year).',
  },
  {
    key: 'reportsOtherAgencies',
    label: 'Reports from Other Agencies',
    description: 'Reports from Regional Center, Medical, OT/PT, Outside Speech & Language, and/or Mental Health.',
  },
  {
    key: 'currentIEP',
    label: 'Current IEP',
    description: 'With updated goals, objectives, and current present levels of performance; documentation of progress toward goals.',
  },
  {
    key: 'currentBehaviorPlan',
    label: 'Current Behavior Plan(s)',
    description: 'With documentation of effectiveness and modifications; includes antecedents that may trigger inappropriate behavior.',
  },
  {
    key: 'iepDocumentation',
    label: 'IEP Documentation — More Restrictive Environment',
    description: 'Recommendations and rationale for need for a more restrictive environment; all supplemental aids and services attempted.',
  },
  {
    key: 'primaryModeOfLearning',
    label: "Student's Identified Primary Mode of Learning",
    description: 'e.g., visual learner, auditory learner.',
  },
  {
    key: 'prescribedMedication',
    label: 'Prescribed Medication',
    description: 'Medication taken both in and out of school.',
  },
  {
    key: 'immunizationRecord',
    label: 'Current Immunization Record',
    description: 'Up-to-date immunization documentation.',
  },
  {
    key: 'audiogramChart',
    label: 'Most Recent Audiogram Chart & Audiometry Report',
    description: 'If applicable.',
    conditional: true,
  },
  {
    key: 'transcripts',
    label: 'Transcript',
    description: 'Required for Grade 9 and above.',
    conditional: true,
  },
];

export default function LevelIIReferralForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File[]>>({});
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [currentDraftNumber, setCurrentDraftNumber] = useState('');
  const [draftEmail, setDraftEmail] = useState('');
  const [draftBanner, setDraftBanner] = useState('');

  const {
    register,
    control,
    handleSubmit,
    watch,
    getValues,
    reset,
    formState: { errors },
  } = useForm<LevelIIReferralFormData>({
    resolver: zodResolver(levelIIReferralSchema),
    defaultValues: {
      fosterYouth: undefined,
      audiogramApplicable: false,
      districtAdminCertification: false,
      reportsOtherAgencies: {
        regionalCenter: false,
        medical: false,
        otPt: false,
        speechLanguage: false,
        mentalHealth: false,
      },
    },
  });

  const grade = watch('grade');
  const audiogramApplicable = watch('audiogramApplicable');
  const showHomeLanguageSurvey = !isPreschoolGrade(grade);
  const showTranscripts = isHighSchoolGrade(grade);

  // Load a pending draft from sessionStorage on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('pendingDraft');
      if (!raw) return;
      const pending = JSON.parse(raw);
      if (pending.formType !== 'LEVEL_II') return;
      sessionStorage.removeItem('pendingDraft');
      reset(pending.formData);
      setCurrentDraftNumber(pending.draftNumber);
      setDraftEmail(pending.email);
      setDraftBanner(`Draft ${pending.draftNumber} loaded. Note: uploaded documents are not saved — please re-attach them before submitting.`);
    } catch {
      // ignore malformed sessionStorage
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clear uploads that no longer apply when grade changes
  useEffect(() => {
    setUploadedFiles((prev) => {
      let next: Record<string, File[]> | null = null;
      if (!showHomeLanguageSurvey && prev.homeLanguageSurvey) {
        next = { ...(next ?? prev) };
        delete next.homeLanguageSurvey;
      }
      if (!showTranscripts && prev.transcripts) {
        next = { ...(next ?? prev) };
        delete next.transcripts;
      }
      return next ?? prev;
    });
  }, [showHomeLanguageSurvey, showTranscripts]);

  const isDocVisible = (doc: DocConfig) => {
    if (doc.key === 'homeLanguageSurvey') return showHomeLanguageSurvey;
    if (doc.key === 'transcripts') return showTranscripts;
    if (doc.key === 'audiogramChart') return audiogramApplicable;
    return true;
  };

  const handleFileUpload = (key: string, files: FileList | null) => {
    if (files) {
      setUploadedFiles((prev) => ({ ...prev, [key]: Array.from(files) }));
    }
  };

  const onSubmit = async (data: LevelIIReferralFormData) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('data', JSON.stringify({ ...data, formType: 'LEVEL_II' }));

      Object.entries(uploadedFiles).forEach(([key, files]) => {
        files.forEach((file) => formData.append(key, file));
      });

      const response = await fetch('/api/referrals', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Submission failed');

      const result = await response.json();
      router.push(`/referrals/${result.id}/confirmation`);
    } catch (error) {
      toast.error('Error submitting referral. Please try again.');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldClass =
    'w-full rounded-xl border border-cream-200/80 bg-white/70 px-3 py-2 text-sm text-warm-gray-800 shadow-sm transition focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-200/70 focus-visible:outline-none';

  return (
    <>
    <SaveDraftDialog
      isOpen={showDraftDialog}
      onClose={() => setShowDraftDialog(false)}
      formType="LEVEL_II"
      getFormData={() => getValues()}
      existingDraftNumber={currentDraftNumber || undefined}
      existingEmail={draftEmail || undefined}
      onDraftSaved={(draftNumber, email) => {
        setCurrentDraftNumber(draftNumber);
        setDraftEmail(email);
      }}
    />
    <div className="max-w-5xl mx-auto p-8 panel rounded-2xl">
      {draftBanner && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="text-sm text-amber-800">{draftBanner}</p>
          <button type="button" onClick={() => setDraftBanner('')} className="ml-auto text-amber-500 hover:text-amber-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      {/* Logo Header */}
      <div className="mb-6 text-center border-b border-cream-200/70 pb-6">
        <div className="inline-block mb-4">
          <Image
            src="/scsos-logo.png"
            alt="Sutter County Superintendent of Schools"
            width={350}
            height={90}
            priority
            className="h-auto w-auto max-w-[350px]"
          />
        </div>
        <h1 className="text-3xl font-semibold text-warm-gray-900 mb-2">
          Level II Referral Packet
        </h1>
        <p className="text-warm-gray-600 text-sm">
          County Operated Program — Sutter County Superintendent of Schools
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* Section 1: Student Identification */}
        <section className="border-b border-cream-200/70 pb-6">
          <h2 className="text-2xl font-semibold mb-4 text-warm-gray-900">Student Identification</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                  Student Name <span className="text-red-500">*</span>
                </label>
                <input type="text" {...register('studentName')} className={fieldClass} />
                {errors.studentName && (
                  <p className="text-red-500 text-sm mt-1">{errors.studentName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                  Grade <span className="text-red-500">*</span>
                </label>
                <select {...register('grade')} className={fieldClass}>
                  <option value="">Select Grade</option>
                  <option value="PreK">Preschool</option>
                  <option value="TK">TK</option>
                  <option value="K">K</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                    <option key={g} value={g.toString()}>{g}</option>
                  ))}
                </select>
                {errors.grade && (
                  <p className="text-red-500 text-sm mt-1">{errors.grade.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                  Foster Youth <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="Yes"
                      {...register('fosterYouth')}
                      className="mr-2 h-4 w-4 accent-sky-600"
                    />
                    <span className="text-sm text-warm-gray-700">Yes</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="No"
                      {...register('fosterYouth')}
                      className="mr-2 h-4 w-4 accent-sky-600"
                    />
                    <span className="text-sm text-warm-gray-700">No</span>
                  </label>
                </div>
                {errors.fosterYouth && (
                  <p className="text-red-500 text-sm mt-1">{errors.fosterYouth.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input type="date" {...register('dateOfBirth')} className={fieldClass} />
                {errors.dateOfBirth && (
                  <p className="text-red-500 text-sm mt-1">{errors.dateOfBirth.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                  Birthplace <span className="text-red-500">*</span>
                </label>
                <input type="text" {...register('birthplace')} placeholder="City, State/Country" className={fieldClass} />
                {errors.birthplace && (
                  <p className="text-red-500 text-sm mt-1">{errors.birthplace.message}</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Document Submission Checklist */}
        <section className="border-b border-cream-200/70 pb-6">
          <h2 className="text-2xl font-semibold mb-1 text-warm-gray-900">Document Submission Checklist</h2>
          <p className="text-sm text-warm-gray-500 mb-5">
            Electronic documents preferred. Single-sided, no staples. Upload each document below.
          </p>

          <div className="space-y-3">
            {ALL_DOCS.map((doc) => {
              const visible = isDocVisible(doc);
              if (!visible) return null;

              const files = uploadedFiles[doc.key] || [];
              const hasFile = files.length > 0;

              return (
                <div
                  key={doc.key}
                  className="flex items-start gap-4 rounded-xl border border-cream-200/80 bg-white/60 p-4 shadow-sm"
                >
                  {/* Status indicator */}
                  <div className="mt-0.5 shrink-0">
                    {hasFile ? (
                      <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-cream-100 border border-cream-200 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-cream-400" />
                      </div>
                    )}
                  </div>

                  {/* Label + description */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-warm-gray-800 leading-snug">
                      {doc.label}
                      {doc.conditional && (
                        <span className="ml-2 text-xs text-warm-gray-400 font-normal">
                          {doc.key === 'audiogramChart' ? '(if applicable)' :
                           doc.key === 'homeLanguageSurvey' ? '(TK and above)' :
                           doc.key === 'transcripts' ? '(Grade 9+)' : ''}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-warm-gray-500 mt-0.5 leading-snug">{doc.description}</p>

                    {/* Reports from Other Agencies sub-checkboxes */}
                    {doc.key === 'reportsOtherAgencies' && (
                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5">
                        {(
                          [
                            ['regionalCenter', 'Regional Center'],
                            ['medical', 'Medical'],
                            ['otPt', 'OT/PT'],
                            ['speechLanguage', 'Outside Speech & Language'],
                            ['mentalHealth', 'Mental Health'],
                          ] as const
                        ).map(([field, label]) => (
                          <Controller
                            key={field}
                            control={control}
                            name={`reportsOtherAgencies.${field}`}
                            render={({ field: f }) => (
                              <label className="flex items-center gap-1.5 text-xs text-warm-gray-600 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={f.value}
                                  onChange={f.onChange}
                                  className="h-3.5 w-3.5 accent-sky-600 rounded"
                                />
                                {label}
                              </label>
                            )}
                          />
                        ))}
                      </div>
                    )}

                    {/* File list */}
                    {hasFile && (
                      <div className="mt-1.5 space-y-0.5">
                        {files.map((f) => (
                          <p key={f.name} className="text-xs text-emerald-700">
                            {f.name} ({(f.size / 1024 / 1024).toFixed(2)} MB)
                          </p>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Upload button */}
                  <div className="shrink-0">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      {hasFile ? 'Replace' : 'Upload'}
                      <input
                        type="file"
                        className="sr-only"
                        accept=".pdf,.docx,.jpg,.jpeg,.png"
                        multiple
                        onChange={(e) => handleFileUpload(doc.key, e.target.files)}
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Audiogram toggle */}
          <div className="mt-4 flex items-center gap-2">
            <Controller
              control={control}
              name="audiogramApplicable"
              render={({ field }) => (
                <input
                  type="checkbox"
                  id="audiogramApplicable"
                  checked={field.value}
                  onChange={field.onChange}
                  className="h-4 w-4 accent-sky-600 rounded"
                />
              )}
            />
            <label htmlFor="audiogramApplicable" className="text-sm text-warm-gray-700 cursor-pointer">
              Include Audiogram Chart & Audiometry Report (if applicable)
            </label>
          </div>

          {/* EL dates (shown only if home language survey is relevant) */}
          {showHomeLanguageSurvey && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border border-cream-200/80 bg-cream-50/50 p-4">
              <div>
                <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                  EL Start Date
                  <span className="ml-1 text-xs text-warm-gray-400 font-normal">(if applicable)</span>
                </label>
                <input type="date" {...register('elStartDate')} className={fieldClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                  Reclassification Date
                  <span className="ml-1 text-xs text-warm-gray-400 font-normal">(if applicable)</span>
                </label>
                <input type="date" {...register('reclassificationDate')} className={fieldClass} />
              </div>
            </div>
          )}
        </section>

        {/* Section 3: District Authorization */}
        <section className="border-b border-cream-200/70 pb-6">
          <h2 className="text-2xl font-semibold mb-4 text-warm-gray-900">District Authorization</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                  District Admin Name <span className="text-red-500">*</span>
                </label>
                <input type="text" {...register('districtAdminName')} className={fieldClass} />
                {errors.districtAdminName && (
                  <p className="text-red-500 text-sm mt-1">{errors.districtAdminName.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                  District Admin Email <span className="text-red-500">*</span>
                </label>
                <input type="email" {...register('districtAdminEmail')} className={fieldClass} />
                {errors.districtAdminEmail && (
                  <p className="text-red-500 text-sm mt-1">{errors.districtAdminEmail.message}</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-cream-200/80 bg-cream-50/50 p-4">
              <Controller
                control={control}
                name="districtAdminCertification"
                render={({ field }) => (
                  <input
                    type="checkbox"
                    id="districtAdminCertification"
                    checked={field.value}
                    onChange={field.onChange}
                    className="mt-0.5 h-4 w-4 accent-sky-600 rounded shrink-0"
                  />
                )}
              />
              <label htmlFor="districtAdminCertification" className="text-sm text-warm-gray-700 leading-relaxed cursor-pointer">
                I certify that all information provided in this referral packet is accurate and complete to the best of my
                knowledge, and that all required documentation has been included or will be submitted separately.
              </label>
            </div>
            {errors.districtAdminCertification && (
              <p className="text-red-500 text-sm">{errors.districtAdminCertification.message}</p>
            )}
          </div>
        </section>

        {/* Section 4: Additional Comments */}
        <section className="border-b border-cream-200/70 pb-6">
          <h2 className="text-2xl font-semibold mb-4 text-warm-gray-900">Additional Information</h2>
          <div>
            <label className="block text-sm font-medium text-warm-gray-700 mb-1">
              Additional Comments
              <span className="ml-1 text-xs text-warm-gray-400 font-normal">(optional, max 500 characters)</span>
            </label>
            <textarea
              {...register('additionalComments')}
              rows={4}
              className={fieldClass}
              placeholder="Any additional information relevant to this referral..."
            />
            {errors.additionalComments && (
              <p className="text-red-500 text-sm mt-1">{errors.additionalComments.message}</p>
            )}
          </div>
        </section>

        {/* Legal Notice */}
        <div className="rounded-xl bg-cream-50 border border-cream-200/80 p-4">
          <p className="text-xs text-warm-gray-500 leading-relaxed">
            This referral packet is submitted pursuant to California Education Code Section 56325. All student information
            is confidential and protected under FERPA. By submitting this form, you confirm that the information provided
            is accurate and that proper consent has been obtained for the release of student records.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={() => setShowDraftDialog(true)}
          >
            Save Draft
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            size="lg"
            className="px-8"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Referral Packet'}
          </Button>
        </div>
      </form>
    </div>
    </>
  );
}
