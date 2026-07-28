import type { ReactNode } from "react";

type Props = {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  trend?: { value: string; positive?: boolean };
  className?: string;
};

export function StatCard({
  label,
  value,
  hint,
  icon,
  trend,
  className = "",
}: Props) {
  return (
    <div
      className={`rounded-[var(--radius)] border border-line bg-card p-5 shadow-[0_1px_0_rgba(12,31,40,0.04)] ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            {label}
          </p>
          <p className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink">
            {value}
          </p>
        </div>
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sea-100 text-sea-700">
            {icon}
          </div>
        )}
      </div>
      {(hint || trend) && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          {trend && (
            <span
              className={
                trend.positive === false
                  ? "font-semibold text-danger"
                  : "font-semibold text-success"
              }
            >
              {trend.value}
            </span>
          )}
          {hint && <span className="text-muted">{hint}</span>}
        </div>
      )}
    </div>
  );
}
