import { redirect } from "next/navigation";

export default function RedirectAlertesProduction() {
  redirect("/parametres/pilotage?onglet=alertes&module=production");
}
