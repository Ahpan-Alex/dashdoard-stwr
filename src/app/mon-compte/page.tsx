import { Suspense } from "react";
import MonComptePage from "./mon-compte-client";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-sm text-muted">
          Chargement…
        </div>
      }
    >
      <MonComptePage />
    </Suspense>
  );
}
