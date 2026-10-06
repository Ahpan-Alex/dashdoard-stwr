"use client";

import { useState } from "react";
import { Pencil, StickyNote, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { useAuthStore } from "@/lib/auth-store";
import { formatDate } from "@/lib/format";
import { createId } from "@/lib/id";
import { TYPES_NOTE_TIERS } from "@/lib/tiers-fiche";
import type { NoteEchangeTiers, TypeNoteTiers } from "@/lib/types";

type Props = {
  notes: NoteEchangeTiers[];
  onSave: (notes: NoteEchangeTiers[]) => { ok: boolean; reason?: string };
};

export function TiersNotesPanel({ notes, onSave }: Props) {
  const userId = useAuthStore((s) => s.user?.id);
  const peutForcer = useAuthStore((s) => s.hasPermission("clients.gerer"));
  const [type, setType] = useState<TypeNoteTiers | "tous">("tous");
  const [debut, setDebut] = useState("");
  const [fin, setFin] = useState("");
  const [brouillon, setBrouillon] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: "appel" as TypeNoteTiers,
    commentaire: "",
  });
  const [editionId, setEditionId] = useState<string | null>(null);

  const visibles = [...notes]
    .filter((n) => (type === "tous" ? true : n.type === type))
    .filter((n) => {
      const jour = n.date.slice(0, 10);
      if (debut && jour < debut) return false;
      if (fin && jour > fin) return false;
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  function peutModifier(n: NoteEchangeTiers) {
    if (peutForcer) return true;
    return Boolean(n.userId && n.userId === userId);
  }

  function ajouter() {
    const commentaire = brouillon.commentaire.trim();
    if (!commentaire) return;
    const note: NoteEchangeTiers = {
      id: createId("note"),
      date: new Date(`${brouillon.date}T12:00:00`).toISOString(),
      type: brouillon.type,
      commentaire,
    };
    const res = onSave([note, ...notes]);
    if (!res.ok) {
      alert(res.reason ?? "Enregistrement impossible.");
      return;
    }
    setBrouillon((b) => ({ ...b, commentaire: "" }));
  }

  function enregistrerEdition(n: NoteEchangeTiers) {
    const res = onSave(notes.map((x) => (x.id === n.id ? n : x)));
    if (!res.ok) {
      alert(res.reason ?? "Modification impossible.");
      return;
    }
    setEditionId(null);
  }

  function supprimer(n: NoteEchangeTiers) {
    if (!confirm("Supprimer cette note ?")) return;
    const res = onSave(notes.filter((x) => x.id !== n.id));
    if (!res.ok) alert(res.reason ?? "Suppression impossible.");
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        Journal interne. Ces notes ne sont jamais imprimées sur les devis,
        commandes, bons de livraison, factures, achats ou avoirs.
      </p>

      <section className="rounded-[var(--radius)] border border-line bg-card p-5">
        <h2 className="mb-3 font-display text-lg font-semibold">Nouvelle note</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="text-xs font-semibold text-muted">
            Date
            <input
              type="date"
              className="input mt-1"
              value={brouillon.date}
              onChange={(e) =>
                setBrouillon((b) => ({ ...b, date: e.target.value }))
              }
            />
          </label>
          <label className="text-xs font-semibold text-muted">
            Type
            <select
              className="select mt-1"
              value={brouillon.type}
              onChange={(e) =>
                setBrouillon((b) => ({
                  ...b,
                  type: e.target.value as TypeNoteTiers,
                }))
              }
            >
              {TYPES_NOTE_TIERS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-muted sm:col-span-2">
            Commentaire
            <input
              className="input mt-1"
              value={brouillon.commentaire}
              onChange={(e) =>
                setBrouillon((b) => ({ ...b, commentaire: e.target.value }))
              }
            />
          </label>
        </div>
        <button type="button" className="btn btn-primary mt-3" onClick={ajouter}>
          Ajouter
        </button>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-semibold text-muted">
          Type
          <select
            className="select mt-1"
            value={type}
            onChange={(e) => setType(e.target.value as TypeNoteTiers | "tous")}
          >
            <option value="tous">Tous</option>
            {TYPES_NOTE_TIERS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">
          Du
          <input
            type="date"
            className="input mt-1"
            value={debut}
            onChange={(e) => setDebut(e.target.value)}
          />
        </label>
        <label className="text-xs font-semibold text-muted">
          Au
          <input
            type="date"
            className="input mt-1"
            value={fin}
            onChange={(e) => setFin(e.target.value)}
          />
        </label>
      </div>

      {visibles.length === 0 ? (
        <EmptyState
          icon={<StickyNote className="h-5 w-5" />}
          title="Aucune note"
          description="Les échanges internes de ce tiers apparaîtront ici."
        />
      ) : (
        <ul className="space-y-3">
          {visibles.map((n) => (
            <NoteLigne
              key={n.id}
              note={n}
              edition={editionId === n.id}
              peutModifier={peutModifier(n)}
              onEditer={() => setEditionId(n.id)}
              onAnnuler={() => setEditionId(null)}
              onEnregistrer={enregistrerEdition}
              onSupprimer={() => supprimer(n)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function NoteLigne({
  note,
  edition,
  peutModifier,
  onEditer,
  onAnnuler,
  onEnregistrer,
  onSupprimer,
}: {
  note: NoteEchangeTiers;
  edition: boolean;
  peutModifier: boolean;
  onEditer: () => void;
  onAnnuler: () => void;
  onEnregistrer: (n: NoteEchangeTiers) => void;
  onSupprimer: () => void;
}) {
  const [date, setDate] = useState(note.date.slice(0, 10));
  const [type, setType] = useState(note.type);
  const [commentaire, setCommentaire] = useState(note.commentaire);
  const label = TYPES_NOTE_TIERS.find((t) => t.id === note.type)?.label ?? note.type;

  if (edition) {
    return (
      <li className="rounded-[var(--radius)] border border-sea-200 bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <input
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <select
            className="select"
            value={type}
            onChange={(e) => setType(e.target.value as TypeNoteTiers)}
          >
            {TYPES_NOTE_TIERS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <input
            className="input sm:col-span-2"
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
          />
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() =>
              onEnregistrer({
                ...note,
                date: new Date(`${date}T12:00:00`).toISOString(),
                type,
                commentaire: commentaire.trim(),
              })
            }
          >
            Enregistrer
          </button>
          <button type="button" className="btn btn-secondary" onClick={onAnnuler}>
            Annuler
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="rounded-[var(--radius)] border border-line bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">
            {formatDate(note.date)} · {label}
          </p>
          <p className="mt-1 text-sm">{note.commentaire}</p>
          <p className="mt-1 text-xs text-muted">
            {note.userNom || "Utilisateur"}
            {note.modifieLe
              ? ` · modifié le ${formatDate(note.modifieLe)} par ${note.modifieParNom || "un utilisateur habilité"}`
              : ""}
          </p>
        </div>
        {peutModifier && (
          <div className="flex gap-1">
            <button type="button" className="btn btn-secondary" onClick={onEditer}>
              <Pencil className="h-4 w-4" />
            </button>
            <button type="button" className="btn btn-secondary" onClick={onSupprimer}>
              <Trash2 className="h-4 w-4 text-danger" />
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
