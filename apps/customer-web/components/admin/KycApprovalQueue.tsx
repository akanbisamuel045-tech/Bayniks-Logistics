'use client';

import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, X, FileText, Check } from 'lucide-react';

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
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm space-y-4">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-bayniks-orange" />
            <span>Rider Verification &amp; KYC Queue</span>
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">
            Review Lagos State Ministry of Transport Riders Card &amp; Motorcycle particulars
          </p>
        </div>

        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-orange-50 border border-orange-200 text-bayniks-orange">
          {applicants.length} Pending
        </span>
      </div>

      {feedback && (
        <div
          className={`mx-4 p-3 rounded-xl text-xs border flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{feedback.message}</span>
          <button type="button" onClick={() => setFeedback(null)} className="text-slate-500 hover:text-slate-900">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Queue List Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-mono text-[11px] border-b border-slate-200 font-bold">
            <tr>
              <th className="py-2.5 px-4">Applicant Name</th>
              <th className="py-2.5 px-4">Phone / Contact</th>
              <th className="py-2.5 px-4">Plate Number</th>
              <th className="py-2.5 px-4">Riders Card No.</th>
              <th className="py-2.5 px-4">Documents</th>
              <th className="py-2.5 px-4 text-right">Verification Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {applicants.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500 font-mono text-xs">
                  <div className="flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Verification queue clean. No pending rider KYC applications.</span>
                  </div>
                </td>
              </tr>
            ) : (
              applicants.map((applicant) => {
                const isBusy = processingId === applicant.id;
                return (
                  <tr key={applicant.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {applicant.fullName}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      <div>{applicant.phone}</div>
                      {applicant.email && <div className="text-[10px] text-slate-500">{applicant.email}</div>}
                    </td>
                    <td className="py-3 px-4 font-mono text-bayniks-orange font-bold">
                      {applicant.plateNumber}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {applicant.ridersCardNumber}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      {applicant.ridersCardDocumentUrl ? (
                        <a
                          href={applicant.ridersCardDocumentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-bayniks-orange hover:underline flex items-center gap-1 font-semibold"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View Document</span>
                        </a>
                      ) : (
                        <span className="text-slate-400">No file</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={isBusy || isLoading}
                          onClick={() => handleReview(applicant.id, 'approved')}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>

                        <button
                          type="button"
                          disabled={isBusy || isLoading}
                          onClick={() => handleReview(applicant.id, 'rejected')}
                          className="px-3 py-1.5 rounded-xl bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold text-xs shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
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
