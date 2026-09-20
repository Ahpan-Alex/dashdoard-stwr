import { redirect } from "next/navigation";

export default function RedirectHistorique() {
  redirect("/administration/journal-audit?vue=toutes");
}
