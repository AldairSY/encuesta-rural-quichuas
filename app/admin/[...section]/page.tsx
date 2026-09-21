import { redirect, notFound } from "next/navigation";
import { authContext } from "@/lib/auth";
import { AdminRoot } from "@/components/admin/admin-root";
export const dynamic = "force-dynamic";
export default async function AdminPage({
  params,
}: {
  params: Promise<{ section: string[] }>;
}) {
  const { section } = await params;
  const route = section.join("/");
  if (
    ![
      "dashboard",
      "encuestas",
      "candidatos",
      "centros-poblados",
      "participantes",
      "respuestas",
      "resultados",
      "resultados/preview",
      "antifraude",
      "auditoria",
      "configuracion",
    ].includes(route)
  )
    notFound();
  let profile;
  try {
    profile = (await authContext()).profile;
  } catch {
    redirect("/admin");
  }
  return <AdminRoot section={route} profile={profile} />;
}
