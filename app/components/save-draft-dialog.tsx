'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface SaveDraftDialogProps {
  isOpen: boolean;
  onClose: () => void;
  formType: 'INTERIM' | 'DHH_ITINERANT' | 'LEVEL_II';
  getFormData: () => object;
  existingDraftNumber?: string;
  existingEmail?: string;
  onDraftSaved: (draftNumber: string, email: string) => void;
}

export default function SaveDraftDialog({
  isOpen,
  onClose,
  formType,
  getFormData,
  existingDraftNumber,
  existingEmail,
  onDraftSaved,
}: SaveDraftDialogProps) {
  const [email, setEmail] = useState(existingEmail || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedDraftNumber, setSavedDraftNumber] = useState('');

  if (!isOpen) return null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/referrals/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          formType,
          formData: getFormData(),
          draftNumber: existingDraftNumber,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to save draft. Please try again.');
        return;
      }

      setSavedDraftNumber(data.draftNumber);
      onDraftSaved(data.draftNumber, email);
    } catch {
      setError('Failed to save draft. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (!loading) {
      setSavedDraftNumber('');
      setError('');
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-fade-in-up">
        {savedDraftNumber ? (
          /* Success state */
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-warm-gray-900 mb-2">Draft Saved!</h2>
            <p className="text-sm text-warm-gray-600 mb-6">
              A confirmation has been sent to <strong>{email}</strong>. Use this number to resume your form later.
            </p>

            <div className="bg-sage-50 border-2 border-sage-300 rounded-xl p-5 mb-6">
              <p className="text-xs font-bold uppercase tracking-widest text-sage-700 mb-1">Draft Number</p>
              <p className="text-2xl font-bold font-mono tracking-widest text-sage-900">{savedDraftNumber}</p>
              <p className="text-xs text-sage-600 mt-2">Save this number — you'll need it with your email to resume</p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 text-left">
              <p className="text-xs text-amber-800">
                <strong>Note:</strong> Uploaded documents are not saved with your draft. You will need to re-attach them when you resume.
              </p>
            </div>

            <Button onClick={handleClose} className="w-full" size="lg">
              Done
            </Button>
          </div>
        ) : (
          /* Email input state */
          <>
            <button
              type="button"
              onClick={handleClose}
              className="absolute top-4 right-4 text-warm-gray-400 hover:text-warm-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-warm-gray-900 mb-1">Save Your Draft</h2>
            <p className="text-sm text-warm-gray-600 mb-6">
              Enter your email address. We'll send you a draft number to resume this form later.
              Drafts are saved for 30 days.
            </p>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label htmlFor="draft-email" className="block text-sm font-medium text-warm-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  id="draft-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@district.edu"
                  className="w-full rounded-xl border border-cream-200/80 bg-white/70 px-3 py-2.5 text-sm text-warm-gray-800 shadow-sm transition focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-200/70 focus-visible:outline-none"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleClose}
                  className="flex-1"
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={loading || !email}
                >
                  {loading ? 'Saving...' : 'Save Draft'}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
