import React from 'react';

const STATUS_CONFIG = {
  in_progress: {
    label: 'In Progress',
    badgeClass: 'case-status-badge--in-progress',
    dotClass: 'bg-amber-400',
    description: 'Intake and data collection currently active',
  },
  ready_for_review: {
    label: 'Ready for Review',
    badgeClass: 'case-status-badge--ready',
    dotClass: 'bg-sky-400',
    description: 'Intake complete, awaiting clinical evaluation',
  },
  reviewed: {
    label: 'Clinician Reviewed',
    badgeClass: 'case-status-badge--reviewed',
    dotClass: 'bg-emerald-400',
    description: 'Reviewed and verified by healthcare professional',
  },
};

export default function StatusBadge({ status = 'in_progress', className = '' }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.in_progress;

  return (
    <span
      className={`case-status-badge ${config.badgeClass} ${className}`}
      title={config.description}
      role="status"
    >
      <span className={`case-status-badge__dot ${config.dotClass}`} aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
}
