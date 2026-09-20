import { redirect } from "next/navigation";

export default function RedirectRentabilite() {
  redirect("/parametres/pilotage?onglet=objectifs");
}
