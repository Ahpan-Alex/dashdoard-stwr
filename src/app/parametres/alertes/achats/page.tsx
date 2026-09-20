import { redirect } from "next/navigation";

export default function RedirectAlertesAchats() {
  redirect("/parametres/pilotage?onglet=alertes&module=achat");
}
