"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { useAuthStore } from "@/lib/auth-store";
import type { Permission } from "@/lib/auth/rbac";
import { moduleComptabiliteActif } from "@/lib/comptabilite";
import { useStore } from "@/lib/store";
import {
  PARAMETRES_MENUS,
  PARAMETRES_SECTIONS,
  itemParametresActif,
  parametresSectionPourChemin,
  type ParametreItem,
} from "@/lib/parametres-menus";

export { PARAMETRES_MENUS, PARAMETRES_SECTIONS };

function peutVoir(
  hasPermission: (p: Permission) => boolean,
  item: { permission?: Permission; anyOf?: Permission[] },
) {
  if (item.anyOf?.length) return item.anyOf.some((p) => hasPermission(p));
  if (item.permission) return hasPermission(item.permission);
  return true;
}

function Pill({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`btn ${active ? "btn-primary" : "btn-secondary"}`}
    >
      {label}
    </Link>
  );
}

function sectionsVisibles(
  hasPermission: (p: Permission) => boolean,
  moduleCompta: boolean,
) {
  return PARAMETRES_SECTIONS.filter(
    (s) =>
      peutVoir(hasPermission, s) &&
      (moduleCompta || s.id !== "comptabilite"),
  );
}

/** Sous-menu commun à toutes les pages de paramétrage. */
export function ParametresSubnav() {
  const pathname = usePathname();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const moduleCompta = useStore((s) => moduleComptabiliteActif(s.parametres));
  const section = parametresSectionPourChemin(pathname);
  const items = (section?.items ?? []).filter(
    (item) => !item.hidden && peutVoir(hasPermission, item),
  );

  return (
    <div className="mb-6 space-y-2">
      <nav className="flex flex-wrap gap-2">
        {sectionsVisibles(hasPermission, moduleCompta).map((s) => (
          <Pill
            key={s.id}
            href={s.href}
            label={s.label}
            active={section?.id === s.id}
          />
        ))}
      </nav>
      {items.length > 0 && (
        <nav className="flex flex-wrap gap-2">
          {items.map((item) => (
            <Pill
              key={`${item.href}-${item.label}`}
              href={item.href}
              label={item.label}
              active={itemParametresActif(pathname, item)}
            />
          ))}
        </nav>
      )}
    </div>
  );
}

export function ParametresItemCards({ items }: { items: ParametreItem[] }) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const visibles = items.filter(
    (item) => !item.hidden && peutVoir(hasPermission, item),
  );
  if (visibles.length === 0) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {visibles.map((item) => (
        <Link
          key={`${item.href}-${item.label}`}
          href={item.href}
          className="rounded-[var(--radius)] border border-line bg-card p-4 transition-shadow hover:border-sea-300 hover:shadow-md"
        >
          <p className="font-display text-base font-semibold text-ink">
            {item.label}
          </p>
          <p className="mt-1 text-xs text-muted">
            {item.description ?? "Ouvrir le paramétrage"}
          </p>
        </Link>
      ))}
    </div>
  );
}

export function ParametresSectionFrame({
  sectionId,
  children,
}: {
  sectionId: string;
  children?: ReactNode;
}) {
  const section = PARAMETRES_SECTIONS.find((s) => s.id === sectionId);
  if (!section) return null;
  return (
    <div>
      <PageHeader
        title={section.label}
        description={section.description}
        showPosSelector={false}
      />
      <ParametresSubnav />
      {children}
      <ParametresItemCards items={section.items} />
    </div>
  );
}
