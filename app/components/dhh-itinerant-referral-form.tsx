'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { dhhItinerantReferralSchema, type DhhItinerantReferralFormData } from './dhh-itinerant-schema';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { toast } from 'sonner';
import SaveDraftDialog from './save-draft-dialog';

const SERVICE_TYPES = [
  'Screening',
  'Assessment',
  'DHH Itinerant Service',
  'DHH Consult',
] as const;

type DocKey =
  | 'dhhReferralRequest'
  | 'releaseOfInformation'
  | 'currentIEP'
  | 'psychoeducationalReport'
  | 'audiogramAndReport'
  | 'accommodationsModifications';

interface DocConfig {
  key: DocKey;
  label: string;
  description: string;
  conditionalNote?: string;
}

const ALL_DOCS: DocConfig[] = [
  {
    key: 'dhhReferralRequest',
    label: 'DHH Referral Request Form',
    description: 'With LEA Admin signature and date.',
  },
  {
    key: 'releaseOfInformation',
    label: 'Signed Release of Information',
    description: 'Parent/guardian authorization for release of student records.',
  },
  {
    key: 'currentIEP',
    label: 'Current IEP',
    description: 'Most recent Individualized Education Program.',
  },
  {
    key: 'psychoeducationalReport',
    label: 'Current Psychoeducational Report',
    description: 'Most recent psychoeducational evaluation report.',
  },
  {
    key: 'audiogramAndReport',
    label: 'Most Recent Audiogram Chart & Audiology Report',
    description: 'Current audiological assessment and chart.',
  },
  {
    key: 'accommodationsModifications',
    label: 'Accommodations/Modifications Form',
    description: 'Required for Screening or Assessment referrals only.',
    conditionalNote: 'Required for Screening/Assessment',
  },
];

function YesNoField({
  label,
  name,
  register,
  error,
}: {
  label: string;
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: any;
  error?: string;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-warm-gray-700 mb-1">{label}</p>
      <div className="flex gap-5">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="radio" value="Yes" {...register(name)} className="h-4 w-4 accent-sky-600" />
          <span className="text-sm text-warm-gray-700">Yes</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="radio" value="No" {...register(name)} className="h-4 w-4 accent-sky-600" />
          <span className="text-sm text-warm-gray-700">No</span>
        </label>
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}

export default function DhhItinerantReferralForm() {
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
  } = useForm<DhhItinerantReferralFormData>({
    resolver: zodResolver(dhhItinerantReferralSchema),
    defaultValues: {
      isEligibleForSped: undefined,
      eligibilityIEP: {
        autisticLike: false,
        deafness: false,
        intellectualDisability: false,
        otherHealthImpairment: false,
        visualImpairment: false,
        deafBlindness: false,
        emotionalDisturbance: false,
        multipleDisabilities: false,
        specificLearningDisability: false,
      },
      eligibility504: {
        hearingImpairment: false,
        orthopedicImpairment: false,
        speechLanguageImpairment: false,
        traumaticBrainInjury: false,
      },
      areasOfConcern: {
        acoustic: false,
        environmentalAdaptations: false,
        communication: false,
        curriculumAccess: false,
        academic: false,
        visualAccess: false,
        audiological: false,
        other: false,
      },
      assistiveListeningDevices: { fmSystem: false, soundField: false, other: false },
      leaAdminCertification: false,
    },
  });

  const isEligible = watch('isEligibleForSped');
  const medications = watch('medications');
  const recentSurgeries = watch('recentSurgeries');
  const hearingAid = watch('hearingAid');
  const otherAreaConcern = watch('areasOfConcern.other');
  const serviceType = watch('serviceType');
  const needsAccommodationsForm =
    serviceType === 'Screening' || serviceType === 'Assessment';

  // Load a pending draft from sessionStorage on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('pendingDraft');
      if (!raw) return;
      const pending = JSON.parse(raw);
      if (pending.formType !== 'DHH_ITINERANT') return;
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

  const handleFileUpload = (key: string, files: FileList | null) => {
    if (files) {
      setUploadedFiles((prev) => ({ ...prev, [key]: Array.from(files) }));
    }
  };

  const onSubmit = async (data: DhhItinerantReferralFormData) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('data', JSON.stringify({ ...data, formType: 'DHH_ITINERANT' }));
      Object.entries(uploadedFiles).forEach(([key, files]) => {
        files.forEach((file) => formData.append(key, file));
      });

      const response = await fetch('/api/referrals', { method: 'POST', body: formData });
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
      formType="DHH_ITINERANT"
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
      {/* Header */}
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
          DHH Itinerant Referral Packet
        </h1>
        <p className="text-warm-gray-600 text-sm">
          Deaf &amp; Hard of Hearing — Sutter County Superintendent of Schools
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* Section 1: Student & School Information */}
        <section className="border-b border-cream-200/70 pb-6">
          <h2 className="text-2xl font-semibold mb-4 text-warm-gray-900">Student &amp; School Information</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                  Student Name <span className="text-red-500">*</span>
                </label>
                <input type="text" {...register('studentName')} className={fieldClass} />
                {errors.studentName && <p className="text-red-500 text-sm mt-1">{errors.studentName.message}</p>}
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
                {errors.grade && <p className="text-red-500 text-sm mt-1">{errors.grade.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input type="date" {...register('dateOfBirth')} className={fieldClass} />
                {errors.dateOfBirth && <p className="text-red-500 text-sm mt-1">{errors.dateOfBirth.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                  LEA (Local Educational Agency) <span className="text-red-500">*</span>
                </label>
                <input type="text" {...register('lea')} placeholder="e.g., Yuba City Unified School District" className={fieldClass} />
                {errors.lea && <p className="text-red-500 text-sm mt-1">{errors.lea.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                  School Site <span className="text-red-500">*</span>
                </label>
                <input type="text" {...register('schoolSite')} className={fieldClass} />
                {errors.schoolSite && <p className="text-red-500 text-sm mt-1">{errors.schoolSite.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                  General Ed Teacher <span className="text-red-500">*</span>
                </label>
                <input type="text" {...register('generalEdTeacher')} className={fieldClass} />
                {errors.generalEdTeacher && <p className="text-red-500 text-sm mt-1">{errors.generalEdTeacher.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                  Teacher Email &amp; Phone <span className="text-red-500">*</span>
                </label>
                <input type="text" {...register('generalEdTeacherContact')} placeholder="email@district.edu / (530) 000-0000" className={fieldClass} />
                {errors.generalEdTeacherContact && <p className="text-red-500 text-sm mt-1">{errors.generalEdTeacherContact.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                Other Contact Name, Email &amp; Phone
                <span className="ml-1 text-xs text-warm-gray-400 font-normal">(optional)</span>
              </label>
              <input type="text" {...register('otherContact')} placeholder="Name / email / phone" className={fieldClass} />
            </div>
          </div>
        </section>

        {/* Section 2: Service Type */}
        <section className="border-b border-cream-200/70 pb-6">
          <h2 className="text-2xl font-semibold mb-4 text-warm-gray-900">Service Type Requested</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {SERVICE_TYPES.map((type) => (
              <label
                key={type}
                className="flex items-center gap-2 rounded-xl border border-cream-200/80 bg-white/60 p-3 cursor-pointer hover:bg-cream-50 transition-colors"
              >
                <input
                  type="radio"
                  value={type}
                  {...register('serviceType')}
                  className="h-4 w-4 accent-violet-600 shrink-0"
                />
                <span className="text-sm font-medium text-warm-gray-700">{type}</span>
              </label>
            ))}
          </div>
          {errors.serviceType && <p className="text-red-500 text-sm mt-2">{errors.serviceType.message}</p>}
        </section>

        {/* Section 3: Eligibility */}
        <section className="border-b border-cream-200/70 pb-6">
          <h2 className="text-2xl font-semibold mb-2 text-warm-gray-900">Special Education Eligibility</h2>
          <p className="text-sm text-warm-gray-500 mb-4">
            Is the student presently eligible for Special Education services, a 504 Plan, or has an IFSP/IEP?
          </p>

          <div className="flex gap-5 mb-4">
            {(['Yes', 'No'] as const).map((val) => (
              <label key={val} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value={val}
                  {...register('isEligibleForSped')}
                  className="h-4 w-4 accent-sky-600"
                />
                <span className="text-sm font-medium text-warm-gray-700">{val}</span>
              </label>
            ))}
          </div>
          {errors.isEligibleForSped && <p className="text-red-500 text-sm mb-3">{errors.isEligibleForSped.message}</p>}

          {isEligible === 'Yes' && (
            <div className="space-y-4 rounded-xl border border-cream-200/80 bg-cream-50/50 p-4">
              <p className="text-xs text-warm-gray-500">If yes, attach the IFSP/IEP or 504 Plan.</p>

              <div>
                <p className="text-sm font-medium text-warm-gray-700 mb-2">Eligibility per IFSP/IEP (select all that apply)</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(
                    [
                      ['autisticLike', 'Autistic-Like'],
                      ['deafness', 'Deafness'],
                      ['intellectualDisability', 'Intellectual Disability'],
                      ['otherHealthImpairment', 'Other Health Impairment'],
                      ['visualImpairment', 'Visual Impairment'],
                      ['deafBlindness', 'Deaf-Blindness'],
                      ['emotionalDisturbance', 'Emotional Disturbance'],
                      ['multipleDisabilities', 'Multiple Disabilities'],
                      ['specificLearningDisability', 'Specific Learning Disability'],
                    ] as const
                  ).map(([field, label]) => (
                    <Controller
                      key={field}
                      control={control}
                      name={`eligibilityIEP.${field}`}
                      render={({ field: f }) => (
                        <label className="flex items-center gap-1.5 text-sm text-warm-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={f.value}
                            onChange={f.onChange}
                            className="h-4 w-4 accent-sky-600 rounded"
                          />
                          {label}
                        </label>
                      )}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-warm-gray-700 mb-2">Eligibility per 504 Plan (select all that apply)</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(
                    [
                      ['hearingImpairment', 'Hearing Impairment'],
                      ['orthopedicImpairment', 'Orthopedic Impairment'],
                      ['speechLanguageImpairment', 'Speech/Language Impairment'],
                      ['traumaticBrainInjury', 'Traumatic Brain Injury'],
                    ] as const
                  ).map(([field, label]) => (
                    <Controller
                      key={field}
                      control={control}
                      name={`eligibility504.${field}`}
                      render={({ field: f }) => (
                        <label className="flex items-center gap-1.5 text-sm text-warm-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={f.value}
                            onChange={f.onChange}
                            className="h-4 w-4 accent-sky-600 rounded"
                          />
                          {label}
                        </label>
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Section 4: Reason for Request */}
        <section className="border-b border-cream-200/70 pb-6">
          <h2 className="text-2xl font-semibold mb-2 text-warm-gray-900">Reason for Request</h2>
          <p className="text-sm text-warm-gray-500 mb-3">
            Describe specific behaviors or concerns interfering with school functioning.
          </p>
          <textarea
            {...register('reasonForRequest')}
            rows={4}
            className={fieldClass}
            placeholder="Please state the reason for the request and your concerns..."
          />
          {errors.reasonForRequest && <p className="text-red-500 text-sm mt-1">{errors.reasonForRequest.message}</p>}
        </section>

        {/* Section 5: Areas of Concern */}
        <section className="border-b border-cream-200/70 pb-6">
          <h2 className="text-2xl font-semibold mb-4 text-warm-gray-900">Areas of Concern</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {(
              [
                ['acoustic', 'Acoustic'],
                ['environmentalAdaptations', 'Environmental Adaptations'],
                ['communication', 'Communication'],
                ['curriculumAccess', 'Curriculum Access'],
                ['academic', 'Academic'],
                ['visualAccess', 'Visual Access'],
                ['audiological', 'Audiological'],
                ['other', 'Other'],
              ] as const
            ).map(([field, label]) => (
              <Controller
                key={field}
                control={control}
                name={`areasOfConcern.${field}`}
                render={({ field: f }) => (
                  <label className="flex items-center gap-1.5 text-sm text-warm-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={f.value as boolean}
                      onChange={f.onChange}
                      className="h-4 w-4 accent-sky-600 rounded"
                    />
                    {label}
                  </label>
                )}
              />
            ))}
          </div>
          {otherAreaConcern && (
            <div>
              <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                Describe other area of concern <span className="text-red-500">*</span>
              </label>
              <input type="text" {...register('areasOfConcern.otherDescription')} className={fieldClass} />
              {errors.areasOfConcern?.otherDescription && (
                <p className="text-red-500 text-sm mt-1">{errors.areasOfConcern.otherDescription.message}</p>
              )}
            </div>
          )}
        </section>

        {/* Section 6: Health Status */}
        <section className="border-b border-cream-200/70 pb-6">
          <h2 className="text-2xl font-semibold mb-4 text-warm-gray-900">General Health Status</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <YesNoField
                label="History of seizures"
                name="historyOfSeizures"
                register={register}
                error={errors.historyOfSeizures?.message}
              />
              <YesNoField
                label="Vision adequate"
                name="visionAdequate"
                register={register}
                error={errors.visionAdequate?.message}
              />
            </div>

            <div className="space-y-2">
              <YesNoField
                label="Medications"
                name="medications"
                register={register}
                error={errors.medications?.message}
              />
              {medications === 'Yes' && (
                <div>
                  <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                    List medications <span className="text-red-500">*</span>
                  </label>
                  <input type="text" {...register('medicationsList')} className={fieldClass} />
                  {errors.medicationsList && <p className="text-red-500 text-sm mt-1">{errors.medicationsList.message}</p>}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <YesNoField
                label="Recent surgeries"
                name="recentSurgeries"
                register={register}
                error={errors.recentSurgeries?.message}
              />
              {recentSurgeries === 'Yes' && (
                <div>
                  <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                    Describe recent surgeries <span className="text-red-500">*</span>
                  </label>
                  <input type="text" {...register('recentSurgeriesDescription')} className={fieldClass} />
                  {errors.recentSurgeriesDescription && <p className="text-red-500 text-sm mt-1">{errors.recentSurgeriesDescription.message}</p>}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <YesNoField
                label="Hearing aid"
                name="hearingAid"
                register={register}
                error={errors.hearingAid?.message}
              />
              {hearingAid === 'Yes' && (
                <div>
                  <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                    Hearing aid make/model <span className="text-red-500">*</span>
                  </label>
                  <input type="text" {...register('hearingAidMakeModel')} className={fieldClass} />
                  {errors.hearingAidMakeModel && <p className="text-red-500 text-sm mt-1">{errors.hearingAidMakeModel.message}</p>}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <YesNoField
                label="Audiogram chart available"
                name="hasAudiogramChart"
                register={register}
                error={errors.hasAudiogramChart?.message}
              />
              <YesNoField
                label="Audiology report/notes available"
                name="hasAudiologyReport"
                register={register}
                error={errors.hasAudiologyReport?.message}
              />
            </div>
            <p className="text-xs text-warm-gray-400">If yes to audiogram/audiology report, please upload below.</p>
          </div>
        </section>

        {/* Section 7: Assistive Listening Devices */}
        <section className="border-b border-cream-200/70 pb-6">
          <h2 className="text-2xl font-semibold mb-4 text-warm-gray-900">Assistive Listening Devices</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-warm-gray-700 mb-2">Current assistive listening devices being used</p>
              <div className="flex flex-wrap gap-5">
                {(
                  [
                    ['fmSystem', 'FM System'],
                    ['soundField', 'Sound Field'],
                    ['other', 'Other'],
                  ] as const
                ).map(([field, label]) => (
                  <Controller
                    key={field}
                    control={control}
                    name={`assistiveListeningDevices.${field}`}
                    render={({ field: f }) => (
                      <label className="flex items-center gap-1.5 text-sm text-warm-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={f.value}
                          onChange={f.onChange}
                          className="h-4 w-4 accent-sky-600 rounded"
                        />
                        {label}
                      </label>
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <YesNoField
                label="Staff have knowledge to support ALD(s)?"
                name="staffKnowledgeALD"
                register={register}
                error={errors.staffKnowledgeALD?.message}
              />
              <YesNoField
                label="Additional training beneficial?"
                name="additionalTrainingNeeded"
                register={register}
                error={errors.additionalTrainingNeeded?.message}
              />
              <YesNoField
                label="ALD(s) sufficient in classroom?"
                name="aldSufficient"
                register={register}
                error={errors.aldSufficient?.message}
              />
            </div>
          </div>
        </section>

        {/* Section 8: Additional Concerns */}
        <section className="border-b border-cream-200/70 pb-6">
          <h2 className="text-2xl font-semibold mb-2 text-warm-gray-900">Additional Concerns</h2>
          <p className="text-sm text-warm-gray-500 mb-3">Other areas of concern not covered above:</p>
          <textarea
            {...register('additionalConcerns')}
            rows={3}
            className={fieldClass}
            placeholder="Any additional concerns..."
          />
        </section>

        {/* Section 9: Document Uploads */}
        <section className="border-b border-cream-200/70 pb-6">
          <h2 className="text-2xl font-semibold mb-1 text-warm-gray-900">Required Documents</h2>
          <p className="text-sm text-warm-gray-500 mb-5">
            Electronic documents preferred. Single-sided, no staples.
          </p>
          <div className="space-y-3">
            {ALL_DOCS.map((doc) => {
              const isConditionalRequired =
                doc.key === 'accommodationsModifications' && !needsAccommodationsForm;
              if (isConditionalRequired && !needsAccommodationsForm) {
                // Still show it but with a note it may not be required
              }
              const files = uploadedFiles[doc.key] || [];
              const hasFile = files.length > 0;

              return (
                <div
                  key={doc.key}
                  className="flex items-start gap-4 rounded-xl border border-cream-200/80 bg-white/60 p-4 shadow-sm"
                >
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

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-warm-gray-800 leading-snug">
                      {doc.label}
                      {doc.conditionalNote && (
                        <span className="ml-2 text-xs text-warm-gray-400 font-normal">
                          ({doc.conditionalNote})
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-warm-gray-500 mt-0.5 leading-snug">{doc.description}</p>
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

                  <div className="shrink-0">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100 transition-colors">
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
        </section>

        {/* Section 10: LEA Admin Authorization */}
        <section className="border-b border-cream-200/70 pb-6">
          <h2 className="text-2xl font-semibold mb-4 text-warm-gray-900">LEA Admin Authorization</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                Referring LEA Admin Name <span className="text-red-500">*</span>
              </label>
              <input type="text" {...register('leaAdminName')} className={fieldClass} />
              {errors.leaAdminName && <p className="text-red-500 text-sm mt-1">{errors.leaAdminName.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                Additional Comments
                <span className="ml-1 text-xs text-warm-gray-400 font-normal">(optional, max 500 characters)</span>
              </label>
              <textarea
                {...register('additionalComments')}
                rows={3}
                className={fieldClass}
                placeholder="Any additional information..."
              />
              {errors.additionalComments && <p className="text-red-500 text-sm mt-1">{errors.additionalComments.message}</p>}
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-cream-200/80 bg-cream-50/50 p-4">
              <Controller
                control={control}
                name="leaAdminCertification"
                render={({ field }) => (
                  <input
                    type="checkbox"
                    id="leaAdminCertification"
                    checked={field.value}
                    onChange={field.onChange}
                    className="mt-0.5 h-4 w-4 accent-sky-600 rounded shrink-0"
                  />
                )}
              />
              <label htmlFor="leaAdminCertification" className="text-sm text-warm-gray-700 leading-relaxed cursor-pointer">
                I certify that the information in this referral is accurate and complete to the best of my knowledge,
                and that all required documents have been included or will be submitted separately.
              </label>
            </div>
            {errors.leaAdminCertification && (
              <p className="text-red-500 text-sm">{errors.leaAdminCertification.message}</p>
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
          <Button type="submit" disabled={isSubmitting} size="lg" className="px-8">
            {isSubmitting ? 'Submitting...' : 'Submit Referral Packet'}
          </Button>
        </div>
      </form>
    </div>
    </>
  );
}
