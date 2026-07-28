import { Suspense } from "react";
import ReinitialiserMotDePassePage from "./reset-client";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-sea-950 text-sea-200">
          Chargement…
        </div>
      }
    >
      <ReinitialiserMotDePassePage />
    </Suspense>
  );
}
