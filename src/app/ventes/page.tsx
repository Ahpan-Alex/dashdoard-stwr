import { redirect } from "next/navigation";

/** Les ventes passent uniquement par la facturation. */
export default function VentesRedirectPage() {
  redirect("/factures");
}
