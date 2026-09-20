import { redirect } from "next/navigation";

export default function RedirectAlertesStock() {
  redirect("/parametres/pilotage?onglet=alertes&module=stock");
}
