"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_SECTIONS } from "./sidebar";
import { PARAMETRES_SECTIONS } from "@/lib/parametres-menus";

type Crumb = { href: string; label: string };

function childMatches(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function crumbsPourChemin(pathname: string): Crumb[] {
  if (
    pathname === "/login" ||
    pathname.startsWith("/mot-de-passe-oublie") ||
    pathname.startsWith("/reinitialiser-mot-de-passe")
  ) {
    return [];
  }
  const crumbs: Crumb[] = [];
  for (const section of NAV_SECTIONS) {
    for (const link of section.links) {
      const prefixes = link.matchPrefixes ?? [];
      const inGroup =
        pathname === link.href ||
        pathname.startsWith(`${link.href}/`) ||
        prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
      if (!inGroup) continue;
      crumbs.push({ href: link.href, label: link.label });
      for (const child of link.children ?? []) {
        if (!childMatches(pathname, child.href, child.exact) &&
            !(child.children ?? []).some((n) => childMatches(pathname, n.href, n.exact) ||
              (n.children ?? []).some((d) => childMatches(pathname, d.href, d.exact)))) {
          continue;
        }
        if (child.href !== link.href || child.label !== link.label) {
          crumbs.push({ href: child.href, label: child.label });
        }
        for (const n of child.children ?? []) {
          if (
            !childMatches(pathname, n.href, n.exact) &&
            !(n.children ?? []).some((d) => childMatches(pathname, d.href, d.exact))
          ) {
            continue;
          }
          crumbs.push({ href: n.href, label: n.label });
          for (const d of n.children ?? []) {
            if (childMatches(pathname, d.href, d.exact)) {
              crumbs.push({ href: d.href, label: d.label });
            }
          }
        }
      }
      return dedupeCrumbs(crumbs);
    }
  }
  if (pathname.startsWith("/parametres")) {
    crumbs.push({ href: "/parametres", label: "Paramètres" });
    for (const section of PARAMETRES_SECTIONS) {
      const inSection =
        pathname === section.href ||
        pathname.startsWith(`${section.href}/`) ||
        (section.aliases ?? []).some((a) => pathname === a || pathname.startsWith(`${a}/`)) ||
        section.items.some(
          (it) => pathname === it.href || pathname.startsWith(`${it.href}/`),
        );
      if (!inSection) continue;
      crumbs.push({ href: section.href, label: section.label });
      for (const item of section.items) {
        if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
          crumbs.push({ href: item.href, label: item.label });
        }
      }
    }
  }
  return dedupeCrumbs(crumbs);
}

function dedupeCrumbs(crumbs: Crumb[]) {
  const out: Crumb[] = [];
  for (const c of crumbs) {
    const last = out[out.length - 1];
    if (last && last.href === c.href && last.label === c.label) continue;
    out.push(c);
  }
  return out;
}

export function FilAriane() {
  const pathname = usePathname();
  const crumbs = crumbsPourChemin(pathname);
  if (crumbs.length < 2) return null;
  return (
    <nav aria-label="Fil d'Ariane" className="mb-4 text-xs text-muted">
      <ol className="flex flex-wrap items-center gap-1">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={`${c.href}-${c.label}`} className="flex items-center gap-1">
              {i > 0 && <span className="text-sea-400">›</span>}
              {last ? (
                <span className="font-medium text-ink">{c.label}</span>
              ) : (
                <Link href={c.href} className="hover:text-sea-800 hover:underline">
                  {c.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
