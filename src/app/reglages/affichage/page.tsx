import { redirect } from "next/navigation";

export default async function ReglagesAffichageRedirect({
  searchParams,
}: {
  searchParams: Promise<{ table?: string }>;
}) {
  const { table } = await searchParams;
  const q = table ? `?table=${encodeURIComponent(table)}` : "";
  redirect(`/parametres/affichage${q}`);
}
