"use client";

import { Eye, Pencil, Trash2 } from "lucide-react";

type Props = {
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  deleteDisabled?: boolean;
  deleteReason?: string;
};

export function RowCrudActions({
  onView,
  onEdit,
  onDelete,
  deleteDisabled = false,
  deleteReason,
}: Props) {
  return (
    <div className="flex flex-wrap gap-1">
      <button type="button" className="btn btn-secondary" onClick={onView}>
        <Eye className="h-4 w-4" />
        Visualiser
      </button>
      <button type="button" className="btn btn-secondary" onClick={onEdit}>
        <Pencil className="h-4 w-4" />
        Modifier
      </button>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={onDelete}
        disabled={deleteDisabled}
        title={
          deleteDisabled
            ? (deleteReason ?? "Suppression impossible")
            : "Supprimer"
        }
      >
        <Trash2
          className={`h-4 w-4 ${deleteDisabled ? "text-muted" : "text-danger"}`}
        />
        Supprimer
      </button>
    </div>
  );
}
