"use client";

import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";

type Show = (id: string) => boolean;

export function ThCol({
  id,
  show,
  children,
  ...rest
}: {
  id: string;
  show: Show;
  children?: ReactNode;
} & ThHTMLAttributes<HTMLTableCellElement>) {
  if (!show(id)) return null;
  return <th {...rest}>{children}</th>;
}

export function TdCol({
  id,
  show,
  children,
  ...rest
}: {
  id: string;
  show: Show;
  children?: ReactNode;
} & TdHTMLAttributes<HTMLTableCellElement>) {
  if (!show(id)) return null;
  return <td {...rest}>{children}</td>;
}
