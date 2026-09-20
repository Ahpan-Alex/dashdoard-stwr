import { redirect } from "next/navigation";

export default function ReglagesAlertesRedirect() {
  redirect("/parametres/pilotage?onglet=alertes");
}
