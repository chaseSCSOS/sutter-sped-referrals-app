import InterimReferralForm from '../components/interim-referral-form';

export default function InterimReferralFormPage() {
  return (
    <div className="relative min-h-screen px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute left-0 right-0 top-0 -z-10 h-72 bg-[radial-gradient(ellipse_at_top,_rgba(143,179,177,0.18),_transparent_60%)]" />
      <InterimReferralForm />
    </div>
  );
}
