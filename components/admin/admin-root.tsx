"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  MapPin,
  MessageSquare,
  ChartNoAxesCombined,
  ShieldCheck,
  History,
  Settings,
  Vote,
  LogOut,
  ArrowUpRight,
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/client";
import type { Catalog, Profile } from "@/lib/types";
import { CatalogManager } from "./catalog-manager";
import { Records } from "./records";
import { AdminResults } from "./admin-results";
import { Configuration } from "./configuration";
const menu = [
  { path: "dashboard", label: "Panel general", icon: LayoutDashboard },
  { path: "encuestas", label: "Encuestas", icon: ClipboardList },
  { path: "candidatos", label: "Candidatos", icon: Users },
  { path: "centros-poblados", label: "Centros Poblados", icon: MapPin },
  { path: "participantes", label: "Participantes", icon: Users },
  { path: "respuestas", label: "Respuestas", icon: MessageSquare },
  { path: "resultados", label: "Resultados", icon: ChartNoAxesCombined },
  { path: "antifraude", label: "Control antifraude", icon: ShieldCheck },
  { path: "auditoria", label: "Auditoría", icon: History },
  { path: "configuracion", label: "Configuración", icon: Settings },
];
export function AdminRoot({
  section,
  profile,
}: {
  section: string;
  profile: Profile;
}) {
  const [catalog, setCatalog] = useState<Catalog | null>(null),
    [error, setError] = useState("");
  async function reload() {
    try {
      setCatalog(await api<Catalog>("admin/catalogs"));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de conexión.");
    }
  }
  useEffect(() => {
    void api<Catalog>("admin/catalogs")
      .then(setCatalog)
      .catch((e) => setError(e.message));
  }, []);
  const title =
    menu.find((m) => section.startsWith(m.path))?.label || "Administración";
  return (
    <SidebarProvider>
      <Sidebar className="admin-sidebar">
        <SidebarHeader>
          <Link href="/admin/dashboard" className="admin-brand">
            <Vote size={25} />
            <span>
              ENCUESTA
              <br />
              RURAL
            </span>
          </Link>
          <span className="sidebar-caption">ADMINISTRACIÓN</span>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {menu.map((m) => (
              <SidebarMenuItem key={m.path}>
                <SidebarMenuButton
                  asChild
                  isActive={section.startsWith(m.path)}
                >
                  <Link href={`/admin/${m.path}`}>
                    <m.icon />
                    <span>{m.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <Link className="sidebar-public" href="/">
            Ver sitio público <ArrowUpRight size={16} />
          </Link>
          <div className="sidebar-user">
            <strong>{profile.nombre}</strong>
            <small>{profile.rol.replaceAll("_", " ")}</small>
          </div>
          <button
            className="sidebar-logout"
            onClick={async () => {
              await api("auth/logout", {});
              window.location.assign("/admin");
            }}
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="admin-inset">
        <header className="admin-top">
          <SidebarTrigger />
          <span>
            Administración <span className="muted">/ {title}</span>
          </span>
          <Link href="/informacion">Información del sondeo</Link>
        </header>
        <main className="admin-main">
          <div className="admin-heading">
            <div>
              <span className="eyebrow blue">
                {catalog?.config.distrito || "ENCUESTA RURAL"}
              </span>
              <h1>{title}</h1>
            </div>
            <span className="tag">{profile.rol.replaceAll("_", " ")}</span>
          </div>
          {error && (
            <p role="alert" className="notice error">
              {error}
              <button onClick={reload}> Reintentar</button>
            </p>
          )}
          {!catalog ? (
            <Skeleton className="h-64 w-full" />
          ) : section === "dashboard" ? (
            <Dashboard />
          ) : ["encuestas", "candidatos", "centros-poblados"].includes(
              section,
            ) ? (
            <CatalogManager
              entity={
                section === "centros-poblados"
                  ? "centros_poblados"
                  : (section as "encuestas" | "candidatos")
              }
              catalog={catalog}
              profile={profile}
              reload={reload}
            />
          ) : [
              "participantes",
              "respuestas",
              "antifraude",
              "auditoria",
            ].includes(section) ? (
            <Records
              entity={
                section === "antifraude"
                  ? "fraud_events"
                  : section === "auditoria"
                    ? "audit_logs"
                    : (section as "participantes" | "respuestas")
              }
              catalog={catalog}
              profile={profile}
            />
          ) : section.startsWith("resultados") ? (
            <AdminResults
              catalog={catalog}
              profile={profile}
              previewOnly={section.endsWith("preview")}
            />
          ) : (
            <Configuration
              catalog={catalog}
              profile={profile}
              reload={reload}
            />
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
interface DashboardData {
  participantes: number;
  validas: number;
  en_revision: number;
  invalidadas: number;
  centros: number;
  comunidades: number;
  alertas: number;
  hoy: number;
  por_centro: { nombre: string; cantidad: number }[];
}
function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    api<DashboardData>("admin/dashboard")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  if (error) return <p className="notice error">{error}</p>;
  if (!data) return <Skeleton className="h-64 w-full" />;
  return (
    <>
      <p className="admin-description">
        Actividad real del sistema. Los registros en revisión e invalidados se
        muestran por separado.
      </p>
      <div className="dashboard-grid">
        {[
          ["Participantes", data.participantes],
          ["Respuestas válidas", data.validas],
          ["En revisión", data.en_revision],
          ["Invalidadas", data.invalidadas],
          ["Centros Poblados", data.centros],
          ["Comunidades", data.comunidades],
          ["Alertas pendientes", data.alertas],
          ["Registros hoy", data.hoy],
        ].map(([label, value]) => (
          <section className="dashboard-stat" key={label}>
            <span>{label}</span>
            <strong>{Number(value).toLocaleString("es-PE")}</strong>
          </section>
        ))}
      </div>
      <div className="dashboard-bottom">
        <section className="panel">
          <h2 className="section-title">Participación por comunidad</h2>
          {data.por_centro.length ? (
            data.por_centro.map((c) => (
              <div className="community-bar" key={c.nombre}>
                <span>{c.nombre}</span>
                <meter
                  min={0}
                  max={Math.max(
                    ...data.por_centro.map((x) => Number(x.cantidad)),
                    1,
                  )}
                  value={Number(c.cantidad)}
                />
                <strong>{c.cantidad}</strong>
              </div>
            ))
          ) : (
            <p>Aún no se han registrado respuestas válidas.</p>
          )}
        </section>
        <section className="panel">
          <h2 className="section-title">Preparar el sondeo</h2>
          <p>
            Configura el ámbito, carga comunidades y candidatos, y define el
            periodo de participación.
          </p>
          <div className="actions">
            <Link href="/admin/encuestas" className="button">
              Gestionar encuestas
            </Link>
            <Link href="/admin/antifraude" className="inline-link">
              Revisar alertas
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
