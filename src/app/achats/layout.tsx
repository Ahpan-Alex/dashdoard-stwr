"use client";

import type { ReactNode } from "react";
import { RequirePermission } from "@/components/require-permission";

export default function AchatsLayout({ children }: { children: ReactNode }) {
  return (
    <RequirePermission permission={["achats.lire", "achats.gerer"]}>
      {children}
    </RequirePermission>
  );
}
