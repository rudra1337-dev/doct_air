import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import caseService from '../../../services/caseService';
import StatusBadge from '../../case/CaseReview/components/StatusBadge';
import '../../patient/PatientDashboard/PatientDashboard.css';

export default function ProfessionalCases() {
  const [cases, setCases] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    const filter = statusFilter === 'all' ? undefined : statusFilter;

    caseService
      .listCases({ status: filter })
      .then((res) => {
        if (isMounted && res?.success && Array.isArray(res.cases)) {
          setCases(res.cases);
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Unable to load clinical case files.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [statusFilter]);

  return (
    <div className="workspace-view">
      <div className="workspace-view__header">
        <div>
          <span className="workspace-view__eyebrow" style={{ color: '#a5b4fc' }}>
            Healthcare Professional Portal
          </span>
          <h1 className="workspace-view__title">Clinical Case Registry</h1>
        </div>
        <Link to="/professional/dashboard" className="btn-ghost">
          &larr; Back to Workspace
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-3 flex-wrap">
        {[
          { id: 'all', label: 'All Cases' },
          { id: 'ready_for_review', label: 'Ready for Review' },
          { id: 'reviewed', label: 'Reviewed by Clinician' },
          { id: 'in_progress', label: 'In Progress (Intake)' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatusFilter(tab.id)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${
              statusFilter === tab.id
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="workspace-placeholder-box">
          <div className="case-spinner" aria-hidden="true" />
          <h2 className="mt-4">Loading clinical cases...</h2>
        </div>
      ) : error ? (
        <div className="workspace-placeholder-box">
          <h2 className="text-rose-400">Failed to load clinical cases</h2>
          <p>{error}</p>
        </div>
      ) : cases.length === 0 ? (
        <div className="workspace-placeholder-box">
          <div style={{ marginBottom: '1.25rem', display: 'inline-block' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" stroke="#a5b4fc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2>No patient cases matching the selected filter.</h2>
          <p>
            Patient intake cases submitted for clinical verification will be indexed here.
          </p>
        </div>
      ) : (
        <div className="workspace-grid">
          {cases.map((c) => {
            const caseId = c.id || c._id;
            const chiefText = c.chiefComplaint?.text || 'Clinical Consultation';
            const hasDiscrepancies = Array.isArray(c.discrepancies) && c.discrepancies.length > 0;
            const updatedDate = c.updatedAt
              ? new Date(c.updatedAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : null;

            return (
              <div key={caseId} className="workspace-grid__item">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-mono text-slate-500">
                      ID: {caseId.slice(-6)}
                    </span>
                    <StatusBadge status={c.status} />
                  </div>

                  <h3 className="mb-2 text-base font-semibold text-slate-100 line-clamp-2">
                    {chiefText}
                  </h3>

                  <div className="flex items-center gap-2 flex-wrap mb-4">
                    {hasDiscrepancies && (
                      <span className="case-tag case-tag--discrepancy text-xs">
                        {c.discrepancies.length} Discrepanc{c.discrepancies.length > 1 ? 'ies' : 'y'}
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      {c.symptoms?.length || 0} Symptoms &bull; {c.reportFindings?.length || 0} Findings
                    </span>
                  </div>

                  {updatedDate && (
                    <p className="text-xs text-slate-500 mb-3">Last updated: {updatedDate}</p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <Link
                    to={`/professional/cases/${caseId}`}
                    className="btn-primary text-xs py-2 px-3 block text-center"
                    style={{ background: '#6366f1' }}
                  >
                    Open Clinical Case File &rarr;
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
