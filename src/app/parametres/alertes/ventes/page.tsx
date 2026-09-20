import { redirect } from "next/navigation";

export default function RedirectAlertesVentes() {
  redirect("/parametres/pilotage?onglet=alertes&module=vente");
}
