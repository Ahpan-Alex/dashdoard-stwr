"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ClientDetailRedirect() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id ?? "");

  useEffect(() => {
    if (id) router.replace(`/tiers/${id}`);
  }, [id, router]);

  return (
    <p className="text-sm text-muted">Redirection vers la fiche tiers…</p>
  );
}
