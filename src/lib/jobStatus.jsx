import React from 'react';
import DashboardStatCard from '../components/dashboard/StatCard';

export const jobStatusMeta = {
  draft: { label: 'Draft', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  posted: { label: 'Open for providers', className: 'bg-sky-50 text-sky-700 border-sky-200' },
  matching: { label: 'Matching', className: 'bg-sky-50 text-sky-700 border-sky-200' },
  offered: { label: 'Offered', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  confirmed: { label: 'Confirmed', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  en_route: { label: 'En route', className: 'bg-purple-50 text-purple-700 border-purple-200' },
  in_progress: { label: 'In progress', className: 'bg-purple-50 text-purple-700 border-purple-200' },
  completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  cancelled: { label: 'Cancelled', className: 'bg-slate-100 text-slate-500 border-slate-200' },
  disputed: { label: 'Disputed', className: 'bg-red-50 text-red-700 border-red-200' },
};

export const jobTypeLabels = {
  artisan_service: 'Artisan service',
  haulage: 'Heavy haulage',
  custom_build: 'Custom build',
};

export const StatusBadge = ({ status }) => {
  const meta = jobStatusMeta[status] || jobStatusMeta.draft;
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${meta.className}`}>
      {meta.label}
    </span>
  );
};

export const StatCard = (props) => <DashboardStatCard {...props} />;
