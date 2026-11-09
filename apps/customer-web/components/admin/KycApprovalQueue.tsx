'use client';

import React, { useState } from 'react';

export interface PendingKycApplicant {
  id: string; // profile id
  riderUserId: string;
  fullName: string;
  phone: string;
  email: string;
  plateNumber: string;
  ridersCardNumber: string;
  ridersCardDocumentUrl: string;
  vehiclePhotoUrl?: string;
  kycStatus: string;
  createdAt: string;
}

export interface KycApprovalQueueProps {
  applicants: PendingKycApplicant[];
  onReviewSuccess: () => void;
  isLoading?: boolean;
}

export function KycApprovalQueue({
  applicants,
  onReviewSuccess,
  isLoading = false,
}: KycApprovalQueueProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleReview = async (applicantId: string, decision: 'approved' | 'rejected') => {
    let rejectionReason: string | undefined;
    if (decision === 'rejected') {
      const reason = window.prompt('Enter rejection reason for applicant:', 'Invalid document / unreadable Riders Card');
      if (reason === null) return; // User cancelled
      rejectionReason = reason;
    }

    setProcessingId(applicantId);
    setFeedback(null);

    try {
      const token = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
        ? window.localStorage.getItem('auth_token')
        : null;
      const response = await fetch(`/api/v1/admin/kyc/${applicantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          decision,
          rejectionReason,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update KYC status');
      }

      setFeedback({
        type: 'success',
        message: `Rider application ${decision === 'approved' ? 'APPROVED' : 'REJECTED'} successfully!`,
      });
      onReviewSuccess();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error processing KYC decision',
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="bg-bayniks-cardDark rounded-2xl border border-slate-800 overflow-hidden shadow-xl space-y-4">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>🪪</span> Rider Verification &amp; KYC Queue
          </h3>
          <p className="text-[11px] text-slate-400">
            Review Lagos State Ministry of Transport Riders Card &amp; Motorcycle particulars
          </p>
        </div>

        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-bayniks-orange/15 border border-bayniks-orange/40 text-bayniks-orange">
          {applicants.length} Pending
        </span>
      </div>

      {feedback && (
        <div
          className={`mx-4 p-3 rounded-xl text-xs border flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
              : 'bg-rose-950/60 border-rose-800 text-rose-200'
          }`}
        >
          <span>{feedback.message}</span>
          <button type="button" onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Queue List Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-bayniks-surfaceDark/60 text-slate-400 font-mono text-[11px] border-b border-slate-800">
            <tr>
              <th className="py-2.5 px-4">Applicant Name</th>
              <th className="py-2.5 px-4">Phone / Contact</th>
              <th className="py-2.5 px-4">Plate Number</th>
              <th className="py-2.5 px-4">Riders Card No.</th>
              <th className="py-2.5 px-4">Documents</th>
              <th className="py-2.5 px-4 text-right">Verification Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {applicants.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500 font-mono text-xs">
                  ✅ Verification queue clean. No pending rider KYC applications.
                </td>
              </tr>
            ) : (
              applicants.map((applicant) => {
                const isBusy = processingId === applicant.id;
                return (
                  <tr key={applicant.id} className="hover:bg-bayniks-surfaceDark/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">
                      {applicant.fullName}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      <div>{applicant.phone}</div>
                      {applicant.email && <div className="text-[10px] text-slate-500">{applicant.email}</div>}
                    </td>
                    <td className="py-3 px-4 font-mono text-bayniks-orange font-bold">
                      {applicant.plateNumber}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {applicant.ridersCardNumber}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      {applicant.ridersCardDocumentUrl ? (
                        <a
                          href={applicant.ridersCardDocumentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-bayniks-orange hover:underline flex items-center gap-1"
                        >
                          <span>📄</span> View Document
                        </a>
                      ) : (
                        <span className="text-slate-600">No file</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={isBusy || isLoading}
                          onClick={() => handleReview(applicant.id, 'approved')}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md transition-all flex items-center gap-1 disabled:opacity-50"
                        >
                          <span>✓</span> Approve
                        </button>

                        <button
                          type="button"
                          disabled={isBusy || isLoading}
                          onClick={() => handleReview(applicant.id, 'rejected')}
                          className="px-3 py-1.5 rounded-xl bg-bayniks-surfaceDark border border-slate-700 text-rose-400 hover:bg-rose-950/40 hover:border-rose-800 font-semibold text-xs transition-all flex items-center gap-1 disabled:opacity-50"
                        >
                          <span>✕</span> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
