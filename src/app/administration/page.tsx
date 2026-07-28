"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";

export default function AdministrationIndexPage() {
  const router = useRouter();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const currentSessionId = useAuthStore((s) => s.currentSessionId);

  useEffect(() => {
    void currentSessionId;
    if (hasPermission("users.gerer")) {
      router.replace("/administration/utilisateurs");
    } else if (hasPermission("audit.lire")) {
      router.replace("/administration/audit");
    } else if (hasPermission("securite.gerer")) {
      router.replace("/administration/sessions");
    } else {
      router.replace("/");
    }
  }, [hasPermission, currentSessionId, router]);

  return (
    <div className="flex h-64 items-center justify-center text-sm text-muted">
      Redirection…
    </div>
  );
}
