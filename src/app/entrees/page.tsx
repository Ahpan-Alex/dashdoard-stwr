import { redirect } from "next/navigation";

/** Ancienne saisie d'entrées : remplacée par le cycle Achats. */
export default function EntreesRedirectPage() {
  redirect("/achats");
}
