import type { ReactNode } from "react";
import { PosSelector } from "./pos-selector";

type Props = {
  title: string;
  description?: string;
  actions?: ReactNode;
  showPosSelector?: boolean;
};

export function PageHeader({
  title,
  description,
  actions,
  showPosSelector = true,
}: Props) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-xl text-sm text-muted">{description}</p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {showPosSelector && <PosSelector />}
        {actions}
      </div>
    </header>
  );
}
