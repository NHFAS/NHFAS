import React from 'react';
import { AlertCircle, LoaderCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

export const Card = ({ title, subtitle, action, children }) => (
  <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    {(title || action) && (
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </header>
    )}
    <div>{children}</div>
  </section>
);

const toneClasses = {
  emerald: 'text-emerald-700 border-emerald-100 bg-emerald-50',
  amber: 'text-amber-700 border-amber-100 bg-amber-50',
  red: 'text-red-700 border-red-100 bg-red-50',
  blue: 'text-blue-700 border-blue-100 bg-blue-50',
  purple: 'text-purple-700 border-purple-100 bg-purple-50',
  slate: 'text-slate-600 border-slate-100 bg-slate-50',
};

export const Badge = ({ tone = 'slate', children }) => (
  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase ${toneClasses[tone] || toneClasses.slate}`}>
    {children}
  </span>
);

const statusTones = {
  active: 'emerald', approved: 'emerald', paid: 'emerald', released: 'emerald', succeeded: 'emerald',
  completed: 'emerald', verified: 'emerald', resolved: 'emerald', winning: 'emerald', disbursed: 'emerald',
  pending: 'amber', submitted: 'amber', scheduled: 'amber', reviewing: 'amber', investigating: 'amber',
  processing: 'amber', offered: 'amber', partially_released: 'amber', quoted: 'amber', in_progress: 'amber',
  en_route: 'amber', matching: 'amber', high: 'amber', medium: 'slate', low: 'slate',
  open: 'blue', posted: 'blue', draft: 'slate',
  suspended: 'red', rejected: 'red', failed: 'red', disputed: 'red', cancelled: 'red',
  overdue: 'red', revoked: 'red', critical: 'red',
  expired: 'slate', closed: 'slate', withdrawn: 'slate', refunded: 'slate',
};

export const StatusBadge = ({ value }) => (
  <Badge tone={statusTones[value] || 'slate'}>{String(value || '—').replace(/_/g, ' ')}</Badge>
);

export const DataTable = ({ columns, rows, empty = 'No records found.', rowKey = 'id', onRowClick }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-200 bg-slate-50/70">
          {columns.map((c) => (
            <th key={c.key} className={`px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-500 ${c.align === 'right' ? 'text-right' : 'text-left'}`}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className="px-3 py-8 text-center text-sm text-slate-400">{empty}</td>
          </tr>
        ) : (
          rows.map((row, idx) => (
            <React.Fragment key={row[rowKey] ?? idx}>
              <tr
                className={onRowClick ? 'cursor-pointer hover:bg-slate-50' : 'hover:bg-slate-50/70'}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((c) => (
                  <td key={c.key} className={`px-3 py-2.5 ${c.align === 'right' ? 'text-right' : ''}`}>
                    {c.render ? c.render(row) : (row[c.key] ?? '—')}
                  </td>
                ))}
              </tr>
            </React.Fragment>
          ))
        )}
      </tbody>
    </table>
  </div>
);

export const Spinner = () => (
  <div className="flex justify-center py-10">
    <LoaderCircle className="h-6 w-6 animate-spin text-slate-400" aria-label="Loading" />
  </div>
);

export const ErrorNote = ({ children }) => (
  <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
    <span>{children}</span>
  </div>
);

// Admin-owned button primitive (the site's shared Button is not used here).
const buttonVariants = {
  primary: 'bg-red-600 text-white shadow-sm hover:bg-red-700 focus:ring-red-500/25',
  outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-300/40',
  ghost: 'text-slate-600 hover:bg-slate-100 focus:ring-slate-300/40',
};
const buttonSizes = {
  sm: 'gap-1 px-2.5 py-1.5 text-xs',
  md: 'gap-2 px-3.5 py-2 text-sm',
  lg: 'gap-2 px-4 py-2.5 text-sm',
};

export const AdminButton = ({ variant = 'primary', size = 'md', className, type = 'button', children, ...props }) => (
  <button
    type={type}
    className={cn(
      'inline-flex items-center justify-center rounded-lg font-semibold transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50',
      buttonVariants[variant] || buttonVariants.primary,
      buttonSizes[size] || buttonSizes.md,
      className,
    )}
    {...props}
  >
    {children}
  </button>
);

export const fmtDate = (v) => (v ? new Date(v).toLocaleDateString() : '—');
export const fmtDateTime = (v) => (v ? new Date(v).toLocaleString() : '—');
export const fmtMoney = (v, currency = 'ETB') => (v == null ? '—' : `${currency} ${Number(v).toLocaleString()}`);

// Loads every profile once and returns an id -> full_name map so tabs can
// resolve foreign keys to display names without per-row joins.
export const loadProfilesMap = async () => {
  const { data } = await supabase.from('profiles').select('id, full_name');
  const map = {};
  (data || []).forEach((p) => { map[p.id] = p.full_name; });
  return map;
};

export const loadJobsMap = async () => {
  const { data } = await supabase.from('jobs').select('id, job_number, title');
  const map = {};
  (data || []).forEach((j) => { map[j.id] = { number: j.job_number, title: j.title }; });
  return map;
};
