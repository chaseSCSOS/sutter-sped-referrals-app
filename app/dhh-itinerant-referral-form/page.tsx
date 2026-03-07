import DhhItinerantReferralForm from '../components/dhh-itinerant-referral-form';

export default function DhhItinerantReferralFormPage() {
  return (
    <div className="relative min-h-screen px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute left-0 right-0 top-0 -z-10 h-72 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.10),_transparent_60%)]" />
      <DhhItinerantReferralForm />
    </div>
  );
}
