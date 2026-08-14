"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
};

/** Bouton icône avec libellé visible au survol / focus. */
export function IconButton({
  label,
  children,
  className = "",
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={`icon-btn ${className}`.trim()}
      data-tooltip={label}
      aria-label={label}
      {...rest}
    >
      {children}
    </button>
  );
}
