'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { interimReferralSchema, type InterimReferralFormData } from './schema';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { toast } from 'sonner';

const US_STATES = [
  { value: 'AL', label: 'Alabama' }, { value: 'AK', label: 'Alaska' }, { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' }, { value: 'CA', label: 'California' }, { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' }, { value: 'DE', label: 'Delaware' }, { value: 'DC', label: 'District of Columbia' },
  { value: 'FL', label: 'Florida' }, { value: 'GA', label: 'Georgia' }, { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' }, { value: 'IL', label: 'Illinois' }, { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' }, { value: 'KS', label: 'Kansas' }, { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' }, { value: 'ME', label: 'Maine' }, { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' }, { value: 'MI', label: 'Michigan' }, { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' }, { value: 'MO', label: 'Missouri' }, { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' }, { value: 'NV', label: 'Nevada' }, { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' }, { value: 'NM', label: 'New Mexico' }, { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' }, { value: 'ND', label: 'North Dakota' }, { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' }, { value: 'OR', label: 'Oregon' }, { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' }, { value: 'SC', label: 'South Carolina' }, { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' }, { value: 'TX', label: 'Texas' }, { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' }, { value: 'VA', label: 'Virginia' }, { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' }, { value: 'WI', label: 'Wisconsin' }, { value: 'WY', label: 'Wyoming' },
] as const;

const PRESCHOOL_GRADES = new Set(['PreK', 'Preschool']);
const HIGH_SCHOOL_GRADES = new Set(['9', '10', '11', '12']);

function isPreschoolGrade(selectedGrade?: string) {
  return Boolean(selectedGrade) && PRESCHOOL_GRADES.has(selectedGrade);
}

function isHighSchoolGrade(selectedGrade?: string) {
  return Boolean(selectedGrade) && HIGH_SCHOOL_GRADES.has(selectedGrade);
}

export default function InterimReferralForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File[]>>({});

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
  } = useForm<InterimReferralFormData>({
    resolver: zodResolver(interimReferralSchema),
    defaultValues: {
      nonSeisIep: 'No',
      specialEdServices: [
        {
          service: '',
          serviceType: 'Individual',
          frequency: '',
          duration: '',
          location: '',
          startDate: '',
          endDate: '',
          serviceProvider: '',
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'specialEdServices',
  });

  // Watch for conditional fields
  const isEL = watch('englishLearner');
  const isRedesignated = watch('redesignated');
  const grade = watch('grade');
  const disabilities = watch('disabilities') || {};
  const dateOfBirth = watch('dateOfBirth');
  const showHomeLanguageSurvey = !isPreschoolGrade(grade);
  const requireHomeLanguageSurvey = Boolean(grade) && showHomeLanguageSurvey;
  const showTranscripts = isHighSchoolGrade(grade);

  // Auto-calculate age from date of birth
  useEffect(() => {
    if (dateOfBirth) {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      // Adjust age if birthday hasn't occurred yet this year
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      setValue('age', age);
    }
  }, [dateOfBirth, setValue]);

  // Remove uploads that no longer apply when grade changes.
  useEffect(() => {
    setUploadedFiles((prev) => {
      let nextState: Record<string, File[]> | null = null;

      if (!showHomeLanguageSurvey && prev.homeLanguageSurvey) {
        nextState = { ...(nextState ?? prev) };
        delete nextState.homeLanguageSurvey;
      }

      if (!showTranscripts && prev.transcripts) {
        nextState = { ...(nextState ?? prev) };
        delete nextState.transcripts;
      }

      return nextState ?? prev;
    });
  }, [showHomeLanguageSurvey, showTranscripts]);

  const onSubmit = async (data: InterimReferralFormData) => {
    setIsSubmitting(true);
    try {
      // Prepare form data with files
      const formData = new FormData();
      formData.append('data', JSON.stringify(data));

      // Append all uploaded files
      Object.entries(uploadedFiles).forEach(([key, files]) => {
        files.forEach((file) => {
          formData.append(key, file);
        });
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

  const handleFileUpload = (documentType: string, files: FileList | null) => {
    if (files) {
      setUploadedFiles((prev) => ({
        ...prev,
        [documentType]: Array.from(files),
      }));
    }
  };

  const fieldClass =
    'w-full rounded-xl border border-cream-200/80 bg-white/70 px-3 py-2 text-sm text-warm-gray-800 shadow-sm transition focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-200/70 focus-visible:outline-none';
  const fieldClassCompact =
    'rounded-xl border border-cream-200/80 bg-white/70 px-3 py-2 text-sm text-warm-gray-800 shadow-sm transition focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-200/70 focus-visible:outline-none';

  return (
    <div className="max-w-5xl mx-auto p-8 panel rounded-2xl">
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
          Interim Placement Referral
        </h1>
        <p className="text-warm-gray-600 text-sm">
          Interim Special Education Services
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Section 1: Student Information */}
        <section className="border-b border-cream-200/70 pb-6">
          <h2 className="text-2xl font-semibold mb-4 text-warm-gray-900">
            Student Information
          </h2>
          <div className="space-y-4">
            {/* Student Name, Date of Birth, Age on same line */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                  Student Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('studentName')}
                  className={fieldClass}
                />
                {errors.studentName && (
                  <p className="text-red-500 text-sm mt-1">{errors.studentName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  {...register('dateOfBirth')}
                  className={fieldClass}
                />
                {errors.dateOfBirth && (
                  <p className="text-red-500 text-sm mt-1">{errors.dateOfBirth.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                  Age <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  {...register('age', { valueAsNumber: true })}
                  className={fieldClass}
                />
                {errors.age && (
                  <p className="text-red-500 text-sm mt-1">{errors.age.message}</p>
                )}
              </div>
            </div>

            {/* Grade, Gender, Foster Youth on same line */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                  Grade <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('grade')}
                  className={fieldClass}
                >
                  <option value="">Select Grade</option>
                  <option value="PreK">Preschool</option>
                  <option value="TK">TK</option>
                  <option value="K">K</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                    <option key={g} value={g.toString()}>
                      {g}
                    </option>
                  ))}
                </select>
                {errors.grade && (
                  <p className="text-red-500 text-sm mt-1">{errors.grade.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                  Gender <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('gender')}
                  className={fieldClass}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
                {errors.gender && (
                  <p className="text-red-500 text-sm mt-1">{errors.gender.message}</p>
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
                    Yes
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="No"
                      {...register('fosterYouth')}
                      className="mr-2 h-4 w-4 accent-sky-600"
                    />
                    No
                  </label>
                </div>
                {errors.fosterYouth && (
                  <p className="text-red-500 text-sm mt-1">{errors.fosterYouth.message}</p>
                )}
              </div>
            </div>

            {/* Birthplace on its own line */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                  Birthplace <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('birthplace')}
                  className={fieldClass}
                />
                {errors.birthplace && (
                  <p className="text-red-500 text-sm mt-1">{errors.birthplace.message}</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Contact Information */}
        <section className="border-b border-cream-200/70 pb-6">
          <h2 className="text-2xl font-semibold mb-4 text-warm-gray-900">
            Contact Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                Parent/Guardian Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('parentGuardianName')}
                className={fieldClass}
              />
              {errors.parentGuardianName && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.parentGuardianName.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                Home Phone
              </label>
              <input
                type="tel"
                {...register('homePhone')}
                placeholder="(530) 555-1234"
                className={fieldClass}
              />
              {errors.homePhone && (
                <p className="text-red-500 text-sm mt-1">{errors.homePhone.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                Cell Phone
              </label>
              <input
                type="tel"
                {...register('cellPhone')}
                placeholder="(530) 555-1234"
                className={fieldClass}
              />
              {errors.cellPhone && (
                <p className="text-red-500 text-sm mt-1">{errors.cellPhone.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                Home Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('homeAddress')}
                className={fieldClass}
              />
              {errors.homeAddress && (
                <p className="text-red-500 text-sm mt-1">{errors.homeAddress.message}</p>
              )}
            </div>

            {/* City, State, Zip Code on same line */}
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('city')}
                  className={fieldClass}
                />
                {errors.city && (
                  <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                  State <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('state')}
                  className={fieldClass}
                >
                  <option value="">Select State</option>
                  {US_STATES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                {errors.state && (
                  <p className="text-red-500 text-sm mt-1">{errors.state.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                  Zip Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('zipCode')}
                  maxLength={5}
                  className={fieldClass}
                />
                {errors.zipCode && (
                  <p className="text-red-500 text-sm mt-1">{errors.zipCode.message}</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: School Information */}
        <section className="border-b border-cream-200/70 pb-6">
          <h2 className="text-2xl font-semibold mb-4 text-warm-gray-900">
            School Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                School of Attendance <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('schoolOfAttendance')}
                className={fieldClass}
              />
              {errors.schoolOfAttendance && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.schoolOfAttendance.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                School of Residence <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('schoolOfResidence')}
                className={fieldClass}
              />
              {errors.schoolOfResidence && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.schoolOfResidence.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                Transportation - Special Ed <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="Yes"
                    {...register('transportationSpecialEd')}
                    className="mr-2 h-4 w-4 accent-sky-600"
                  />
                  Yes
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="No"
                    {...register('transportationSpecialEd')}
                    className="mr-2 h-4 w-4 accent-sky-600"
                  />
                  No
                </label>
              </div>
              {errors.transportationSpecialEd && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.transportationSpecialEd.message}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Section 4: Language & Ethnicity */}
        <section className="border-b border-cream-200/70 pb-6">
          <h2 className="text-2xl font-semibold mb-4 text-warm-gray-900">
            Language & Demographics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                Native Language <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('nativeLanguage')}
                className={fieldClass}
              />
              {errors.nativeLanguage && (
                <p className="text-red-500 text-sm mt-1">{errors.nativeLanguage.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                English Learner (EL) <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="Yes"
                    {...register('englishLearner')}
                    className="mr-2 h-4 w-4 accent-sky-600"
                  />
                  Yes
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="No"
                    {...register('englishLearner')}
                    className="mr-2 h-4 w-4 accent-sky-600"
                  />
                  No
                </label>
              </div>
              {errors.englishLearner && (
                <p className="text-red-500 text-sm mt-1">{errors.englishLearner.message}</p>
              )}
            </div>

            {/* Conditional: EL Start Date */}
            {isEL === 'Yes' && (
              <div>
                <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                  EL Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  {...register('elStartDate')}
                  className={fieldClass}
                />
                {errors.elStartDate && (
                  <p className="text-red-500 text-sm mt-1">{errors.elStartDate.message}</p>
                )}
              </div>
            )}

            {/* Conditional: When they became an English learner */}
            {isEL === 'Yes' && (
              <div>
                <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                  When they became an English learner <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  {...register('elBecameDate')}
                  className={fieldClass}
                />
                {errors.elBecameDate && (
                  <p className="text-red-500 text-sm mt-1">{errors.elBecameDate.message}</p>
                )}
              </div>
            )}

            {isEL === 'Yes' && (
              <div>
                <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                  Reclassified? <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="Yes"
                      {...register('redesignated')}
                      className="mr-2 h-4 w-4 accent-sky-600"
                    />
                    Yes
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="No"
                      {...register('redesignated')}
                      className="mr-2 h-4 w-4 accent-sky-600"
                    />
                    No
                  </label>
                </div>
                {errors.redesignated && (
                  <p className="text-red-500 text-sm mt-1">{errors.redesignated.message}</p>
                )}
              </div>
            )}

            {/* Conditional: Reclassification Date */}
            {isRedesignated === 'Yes' && (
              <div>
                <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                  Reclassification Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  {...register('reclassificationDate')}
                  className={fieldClass}
                />
                {errors.reclassificationDate && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.reclassificationDate.message}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                Ethnicity <span className="text-red-500">*</span>
              </label>
              <select
                {...register('ethnicity')}
                className={fieldClass}
              >
                <option value="">Select Ethnicity</option>
                <option value="American Indian/Alaska Native">
                  American Indian/Alaska Native
                </option>
                <option value="Asian">Asian</option>
                <option value="Black/African American">Black/African American</option>
                <option value="Filipino">Filipino</option>
                <option value="Hispanic/Latino">Hispanic/Latino</option>
                <option value="Pacific Islander">Pacific Islander</option>
                <option value="White">White</option>
                <option value="Two or More Races">Two or More Races</option>
                <option value="Decline to State">Decline to State</option>
              </select>
              {errors.ethnicity && (
                <p className="text-red-500 text-sm mt-1">{errors.ethnicity.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                Residency <span className="text-red-500">*</span>
              </label>
              <select
                {...register('residency')}
                className={fieldClass}
              >
                <option value="">Select Residency</option>
                <option value="Parent/Guardian">Parent/Guardian</option>
                <option value="FFH">FFH (Foster Family Home)</option>
                <option value="LCI">LCI (Licensed Children's Institution)</option>
                <option value="Adult Student">Adult Student</option>
                <option value="Other">Other</option>
              </select>
              {errors.residency && (
                <p className="text-red-500 text-sm mt-1">{errors.residency.message}</p>
              )}
            </div>
          </div>
        </section>

        {/* Section 5: Placement Type */}
        <section className="border-b border-cream-200/70 pb-6">
          <h2 className="text-2xl font-semibold mb-4 text-warm-gray-900">Placement Type</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-warm-gray-700 mb-2">
                Select Placement Type <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-6">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="FRA"
                    {...register('placementType')}
                    className="mr-2 h-4 w-4 accent-sky-600"
                  />
                  DHH Interim
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="SDC"
                    {...register('placementType')}
                    className="mr-2 h-4 w-4 accent-sky-600"
                  />
                  SDC placement (Special Day Class)
                </label>
              </div>
              {errors.placementType && (
                <p className="text-red-500 text-sm mt-1">{errors.placementType.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-warm-gray-700 mb-2">
                Non-SEIS IEP? <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-6">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="Yes"
                    {...register('nonSeisIep')}
                    className="mr-2 h-4 w-4 accent-sky-600"
                  />
                  Yes
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="No"
                    {...register('nonSeisIep')}
                    className="mr-2 h-4 w-4 accent-sky-600"
                  />
                  No
                </label>
              </div>
              {errors.nonSeisIep && (
                <p className="text-red-500 text-sm mt-1">{errors.nonSeisIep.message}</p>
              )}
            </div>
          </div>

          </section>

        {/* Section 6: Disability Information */}
        <section className="border-b border-cream-200/70 pb-6">
          <h2 className="text-2xl font-semibold mb-4 text-warm-gray-900">
            Disability Information
          </h2>
          <p className="text-sm text-warm-gray-600 mb-4">
            INDICATE DISABILITY/IES (P = Primary, S = Secondary). Note: For Initial and
            triennial IEPs, assessment must be done and discussed by IEP Team before
            determining eligibility.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { code: '210', name: 'ID (Intellectual Disability)', lowIncidence: false },
              { code: '220', name: 'HH (Hard of Hearing)', lowIncidence: true },
              { code: '230', name: 'Deaf', lowIncidence: true },
              { code: '240', name: 'SLI (Speech/Language Impairment)', lowIncidence: false },
              { code: '250', name: 'VI (Visual Impairment)', lowIncidence: true },
              { code: '260', name: 'ED (Emotional Disturbance)', lowIncidence: false },
              { code: '270', name: 'OI (Orthopedic Impairment)', lowIncidence: true },
              { code: '280', name: 'OHI (Other Health Impairment)', lowIncidence: false },
              { code: '290', name: 'SLD (Specific Learning Disability)', lowIncidence: false },
              { code: '300', name: 'DB (Deaf-Blindness)', lowIncidence: true },
              { code: '310', name: 'MD (Multiple Disabilities)', lowIncidence: false },
              { code: '320', name: 'AUT (Autism)', lowIncidence: false },
              { code: '330', name: 'TBI (Traumatic Brain Injury)', lowIncidence: false },
              {
                code: '281',
                name: 'Est. Med. Dis. (0-5) (Established Medical Disability)',
                lowIncidence: false,
              },
            ].map((disability) => (
              <div key={disability.code} className="flex items-center gap-2">
                <span className="text-sm font-medium text-warm-gray-700 w-12">
                  {disability.code}
                </span>
                <select
                  {...register(`disabilities.${disability.code}` as any)}
                  className={`flex-1 ${fieldClassCompact}`}
                >
                  <option value="">N/A</option>
                  <option value="P">Primary</option>
                  <option value="S">Secondary</option>
                  <option value="T">Tertiary</option>
                </select>
                <span className="text-sm text-warm-gray-600">
                  {disability.name}
                  {disability.lowIncidence && (
                    <span className="text-sky-600 ml-1">*</span>
                  )}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-sky-600 mt-2">* Low Incidence Disability</p>
        </section>

        {/* Section 7: Special Education Dates */}
        <section className="border-b border-cream-200/70 pb-6">
          <h2 className="text-2xl font-semibold mb-4 text-warm-gray-900">
            Special Education Dates
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                SPED Entry Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register('spedEntryDate')}
                className={fieldClass}
              />
              {errors.spedEntryDate && (
                <p className="text-red-500 text-sm mt-1">{errors.spedEntryDate.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                Triennial Due <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register('triennialDue')}
                className={fieldClass}
              />
              {errors.triennialDue && (
                <p className="text-red-500 text-sm mt-1">{errors.triennialDue.message}</p>
              )}
            </div>
          </div>
        </section>

        {/* Section 8: Last Placement Information */}
        <section className="border-b border-cream-200/70 pb-6">
          <h2 className="text-2xl font-semibold mb-4 text-warm-gray-900">
            Last Placement Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                School <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('lastPlacementSchool')}
                className={fieldClass}
              />
              {errors.lastPlacementSchool && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.lastPlacementSchool.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                District <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('lastPlacementDistrict')}
                className={fieldClass}
              />
              {errors.lastPlacementDistrict && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.lastPlacementDistrict.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                County <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('lastPlacementCounty')}
                className={fieldClass}
              />
              {errors.lastPlacementCounty && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.lastPlacementCounty.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                State <span className="text-red-500">*</span>
              </label>
              <select
                {...register('lastPlacementState')}
                className={fieldClass}
              >
                <option value="">Select State</option>
                {US_STATES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              {errors.lastPlacementState && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.lastPlacementState.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-warm-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                {...register('lastPlacementPhone')}
                className={fieldClass}
              />
              {errors.lastPlacementPhone && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.lastPlacementPhone.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                Contact Person
              </label>
              <input
                type="text"
                {...register('lastPlacementContactPerson')}
                className={fieldClass}
              />
              {errors.lastPlacementContactPerson && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.lastPlacementContactPerson.message}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Section 9: Special Education Services */}
        <section className="border-b border-cream-200/70 pb-6">
          <h2 className="text-2xl font-semibold mb-4 text-warm-gray-900">
            Special Education Program Authorization
          </h2>
          <p className="text-sm text-warm-gray-600 mb-4">
            Temporary placement in the following special education service(s) is
            authorized, pending action at the next Individualized Education Program Team
            meeting.
          </p>

          {fields.map((field, index) => (
            <div key={field.id} className="mb-6 p-4 border border-cream-200/70 rounded-xl">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-warm-gray-700">Service #{index + 1}</h3>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                    Special Education Service <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register(`specialEdServices.${index}.service`)}
                    className={fieldClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                    Service Type <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="Individual"
                        {...register(`specialEdServices.${index}.serviceType`)}
                        className="mr-2 h-4 w-4 accent-sky-600"
                      />
                      Individual
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="Group"
                        {...register(`specialEdServices.${index}.serviceType`)}
                        className="mr-2 h-4 w-4 accent-sky-600"
                      />
                      Group
                    </label>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                    Service Provider <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register(`specialEdServices.${index}.serviceProvider`)}
                    className={fieldClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                    Frequency <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register(`specialEdServices.${index}.frequency`)}
                    className={fieldClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                    Duration <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register(`specialEdServices.${index}.duration`)}
                    className={fieldClass}
                    placeholder="days"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                    Location <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register(`specialEdServices.${index}.location`)}
                    className={fieldClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    {...register(`specialEdServices.${index}.startDate`)}
                    className={fieldClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    {...register(`specialEdServices.${index}.endDate`)}
                    className={fieldClass}
                  />
                </div>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              append({
                service: '',
                serviceType: 'Individual',
                frequency: '',
                duration: '',
                location: '',
                startDate: '',
                endDate: '',
                serviceProvider: '',
              })
            }
            className="mb-4"
          >
            + Add Another Service
          </Button>

          <div className="mt-4">
            <label className="block text-sm font-medium text-warm-gray-700 mb-1">
              Percentage of time outside General Ed. class for Sp. Ed services{' '}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              max="100"
              {...register('percentageOutsideGenEd', { valueAsNumber: true })}
              className={`w-32 ${fieldClassCompact}`}
            />
            <span className="ml-2 text-sm text-warm-gray-600">%</span>
            {errors.percentageOutsideGenEd && (
              <p className="text-red-500 text-sm mt-1">
                {errors.percentageOutsideGenEd.message}
              </p>
            )}
          </div>
        </section>

        {/* Section 10: District Authorization */}
        <section className="border-b border-cream-200/70 pb-6">
          <h2 className="text-2xl font-semibold mb-4 text-warm-gray-900">
            District Authorization
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                Name of LEA Representative Making Interim Placement{' '}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('leaRepresentativeName')}
                className={fieldClass}
              />
              {errors.leaRepresentativeName && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.leaRepresentativeName.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                Position <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('leaRepresentativePosition')}
                className={fieldClass}
              />
              {errors.leaRepresentativePosition && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.leaRepresentativePosition.message}
                </p>
              )}
            </div>

            <div className="md:col-span-2 bg-cream-100/80 p-4 rounded-xl">
              <label className="flex items-start">
                <input
                  type="checkbox"
                  {...register('districtAdminCertification')}
                  className="mt-1 mr-2 h-4 w-4 accent-sky-600"
                />
                <span className="text-sm text-warm-gray-700">
                  <span className="text-red-500">*</span> I certify that the information
                  provided in this referral is accurate and complete to the best of my
                  knowledge.
                </span>
              </label>
              {errors.districtAdminCertification && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.districtAdminCertification.message}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Section 11: Document Uploads */}
        <section className="border-b border-cream-200/70 pb-6">
          <h2 className="text-2xl font-semibold mb-4 text-warm-gray-900">
            Required Document Uploads
          </h2>
          <p className="text-sm text-warm-gray-600 mb-4">
            Electronic documents are preferred. Single-sided documents, no staples.
            Accepted formats: PDF, DOCX, JPG, PNG. Maximum file size: 10MB per file.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                Current IEP Date
              </label>
              <input
                type="date"
                {...register('currentIepDate')}
                className={fieldClass}
              />
              {errors.currentIepDate && (
                <p className="text-red-500 text-sm mt-1">{errors.currentIepDate.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-warm-gray-700 mb-1">
                Current Psychoeducational Report Date
              </label>
              <input
                type="date"
                {...register('currentPsychoReportDate')}
                className={fieldClass}
              />
              {errors.currentPsychoReportDate && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.currentPsychoReportDate.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                key: 'studentRegistration',
                label: 'Student Registration Form with current address',
                required: true,
              },
              {
                key: 'homeLanguageSurvey',
                label: 'Home Language Survey TK+ (not applicable for Preschool)',
                required: requireHomeLanguageSurvey,
                visible: showHomeLanguageSurvey,
              },
              {
                key: 'immunizationRecord',
                label: 'Current Immunization Record',
                required: true,
              },
              {
                key: 'releaseOfInformation',
                label: 'Signed Authorization for Release of Information',
                required: true,
              },
              { key: 'currentIEP', label: 'Current IEP', required: true },
              {
                key: 'psychoeducationalReport',
                label: 'Current Psychoeducational Report',
                required: true,
              },
              {
                key: 'transcripts',
                label: 'Transcripts (9th grade and above)',
                required: showTranscripts,
                visible: showTranscripts,
              },
            ]
              .filter((doc) => doc.visible ?? true)
              .map((doc) => (
                <div
                  key={doc.key}
                  className="p-4 border border-cream-200/70 rounded-xl hover:border-sky-300/80 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <label className="text-sm font-medium text-warm-gray-700">
                      {doc.label}
                      {doc.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {uploadedFiles[doc.key]?.length > 0 && (
                      <span className="text-sage-600 text-sm flex items-center">
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Uploaded ({uploadedFiles[doc.key].length} file
                        {uploadedFiles[doc.key].length > 1 ? 's' : ''})
                      </span>
                    )}
                </div>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileUpload(doc.key, e.target.files)}
                  className="block w-full text-sm text-warm-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-cream-100 file:text-warm-gray-700 hover:file:bg-cream-200"
                />
                {uploadedFiles[doc.key]?.map((file, index) => (
                  <div key={index} className="text-xs text-warm-gray-600 mt-1">
                    {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* Section 12: Additional Information */}
        <section className="border-b border-cream-200/70 pb-6">
          <h2 className="text-2xl font-semibold mb-4 text-warm-gray-900">
            Additional Information
          </h2>
          <div>
            <label className="block text-sm font-medium text-warm-gray-700 mb-1">
              Additional Comments or Notes (Optional)
            </label>
            <textarea
              {...register('additionalComments')}
              rows={4}
              maxLength={500}
              placeholder="Use this space to provide any additional information relevant to this referral"
              className={`${fieldClass} min-h-[120px]`}
            />
            <p className="text-xs text-warm-gray-600 mt-1">
              {watch('additionalComments')?.length || 0}/500 characters
            </p>
          </div>
        </section>

        {/* Form Actions */}
        <div className="flex justify-between items-center pt-6">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={() => {
              // Save draft logic here
              toast.success('Draft saved!');
            }}
          >
            Save Draft
          </Button>

          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Referral'}
          </Button>
        </div>

        {/* Legal Notice */}
        <div className="mt-6 p-4 bg-cream-100/70 rounded-xl text-xs text-warm-gray-600">
          <p>
            <strong>California Education Code 56325:</strong> Whenever a pupil transfers
            into a district from a district not operating services under the same local
            plan in which he or she was last enrolled in a special education services
            within the same academic year, the local educational agency shall provide the
            pupil with a free appropriate public education, including services comparable
            to those described in the previously approved individualized education
            program, in consultation with the parents, for a period not to exceed 30 days,
            by which time the local educational agency shall adopt the previously approved
            individualized education program or shall develop, adopt, and implement a new
            individualized education program that is consistent with federal and state
            law.
          </p>
        </div>
      </form>
    </div>
  );
}
