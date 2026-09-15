"use client";

export default function DemandesPrixError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-[var(--radius)] border border-line bg-card p-6">
      <h1 className="font-display text-xl font-semibold text-ink">
        Impossible d’afficher la demande de prix
      </h1>
      <p className="mt-2 text-sm text-muted">
        {error.message || "Une erreur s’est produite. Réessayez ou revenez à la liste."}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary" onClick={() => reset()}>
          Réessayer
        </button>
        <a href="/demandes-prix" className="btn btn-secondary">
          Retour à la liste
        </a>
      </div>
    </div>
  );
}
