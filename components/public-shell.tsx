import Link from "next/link";
import { Vote, ArrowUpRight } from "lucide-react";
import type { Config } from "@/lib/types";
export function PublicShell({
  config,
  children,
}: {
  config: Config | null;
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="public-header">
        <div className="wrap header-row">
          <Link className="brand" href="/">
            <span className="brand-mark">
              {config?.logo_url ? (
                <img src={config.logo_url} alt="Logo" />
              ) : (
                <Vote size={27} />
              )}
            </span>
            <span>
              <strong>{config?.nombre || "ENCUESTA RURAL"}</strong>
              <small>
                {config?.subtitulo || "Sistema de Participación Ciudadana"}
              </small>
            </span>
          </Link>
          <nav aria-label="Navegación principal">
            <Link href="/">Inicio</Link>
            <Link href="/participar">Participar</Link>
            <Link href="/resultados">Resultados</Link>
            <Link href="/informacion">Información</Link>
          </nav>
          <Link className="admin-link" href="/admin">
            Administración <ArrowUpRight size={15} />
          </Link>
        </div>
      </header>
      {children}
      <aside className="disclaimer">
        <div className="wrap">
          Los resultados de este sondeo son referenciales y no tienen sustento
          científico.
        </div>
      </aside>
      <footer className="wrap footer">
        <div>
          <strong>{config?.nombre || "ENCUESTA RURAL"}</strong>
          <p>Sondeo de opinión · Participación ciudadana</p>
        </div>
        <span>
          {config?.distrito} · {config?.provincia} · {config?.departamento}
        </span>
        <Link href="/informacion#privacidad">Privacidad y uso de datos</Link>
      </footer>
    </>
  );
}
