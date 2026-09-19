"use client";

import Link from "next/link";
import { ParametresSectionFrame } from "@/components/parametres-subnav";
import { RegleDelaiParametres } from "@/components/regle-delai-parametres";

export default function ParametresStockPage() {
  return (
    <ParametresSectionFrame sectionId="stock">
      <RegleDelaiParametres type="transfert" />
      <p className="text-sm text-muted">
        Historique des mouvements CUMP de transfert :{" "}
        <Link href="/transferts/historique" className="text-sea-800 underline">
          Transferts → Historique par article
        </Link>
        .
      </p>
    </ParametresSectionFrame>
  );
}
