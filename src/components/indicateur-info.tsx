"use client";

import { useId, useState, type ReactNode } from "react";

export function IndicateurInfo({
  titre,
  children,
}: {
  titre?: string;
  children: ReactNode;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-sea-300 bg-sea-50 text-[11px] font-bold text-sea-800"
        aria-expanded={open}
        aria-controls={id}
        title={titre ?? "D’où vient ce chiffre ?"}
        onClick={() => setOpen((v) => !v)}
      >
        i
      </button>
      {open && (
        <span
          id={id}
          role="note"
          className="absolute left-0 top-6 z-30 w-64 rounded-lg border border-line bg-white p-3 text-left text-xs font-normal normal-case tracking-normal text-ink shadow-lg"
        >
          {children}
        </span>
      )}
    </span>
  );
}
