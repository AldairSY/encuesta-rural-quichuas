import Link from "next/link";
import { MapPin, Info, ArrowRight, Shield } from "lucide-react";
import type { Config } from "@/lib/types";

export function PublicShell({
  config,
  children,
}: {
  config: Config | null;
  children: React.ReactNode;
}) {
  const distrito = config?.distrito || "Andamarca";
  const provincia = config?.provincia || "Concepción";
  const departamento = config?.departamento || "Junín";

  return (
    <div className="flex flex-col min-h-screen bg-[#F7F9FC]">
      {/* Barra superior delgada y elegante */}
      <aside className="top-civic-bar py-1.5 px-4" aria-label="Información cívica">
        <div className="wrap flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="bg-[#C81D25] text-white font-bold px-2 py-0.5 rounded text-[11px] tracking-wider uppercase">
              SONDEO CIUDADANO
            </span>
            <span className="text-slate-300 hidden sm:inline">
              Participación ciudadana distrital
            </span>
          </div>
          <div className="flex items-center gap-1 text-slate-200 font-medium">
            <MapPin size={13} className="text-red-400" />
            <span>
              {distrito} · {provincia} · {departamento}
            </span>
          </div>
        </div>
      </aside>

      {/* Cabecera Moderna Blanca (~72px, Sticky) */}
      <header className="main-header sticky top-0 z-40 bg-white">
        <div className="wrap header-container">
          {/* Logo e Identidad */}
          <Link className="header-brand group" href="/" title="Inicio de Encuesta Rural">
            <div className="brand-icon" aria-hidden="true">
              {config?.logo_url ? (
                <img
                  src={config.logo_url}
                  alt="Logo"
                  className="w-full h-full object-contain p-1 rounded-lg"
                />
              ) : (
                <svg
                  viewBox="0 0 40 40"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-7 h-7 text-white"
                >
                  <rect width="40" height="40" rx="10" fill="#0B2545" />
                  <path
                    d="M12 28V16L20 10L28 16V28H23V21H17V28H12Z"
                    stroke="#FFFFFF"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="20" cy="16" r="2.5" fill="#C81D25" />
                </svg>
              )}
            </div>
            <div className="brand-info">
              <span className="brand-name">
                {config?.nombre || "ENCUESTA RURAL"}
              </span>
              <span className="brand-sub">
                {config?.subtitulo || "Sistema de Participación Ciudadana"}
              </span>
            </div>
          </Link>

          {/* Navegación Central */}
          <nav className="header-nav" aria-label="Navegación principal">
            <Link className="header-nav-link" href="/">
              Inicio
            </Link>
            <Link className="header-nav-link" href="/#encuestas">
              Sondeos
            </Link>
            <Link className="header-nav-link" href="/participar">
              Participar
            </Link>
            <Link className="header-nav-link" href="/resultados">
              Resultados
            </Link>
            <Link className="header-nav-link" href="/informacion">
              Información
            </Link>
          </nav>

          {/* Botón de Acción Destacado en Header */}
          <div className="flex items-center gap-3">
            <Link
              href="/participar"
              className="header-cta-btn"
            >
              <span>PARTICIPAR</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </header>

      {/* Contenido Dinámico */}
      <main className="flex-1">{children}</main>

      {/* Aviso Referencial Elegante (#FFF7ED) */}
      <aside className="wrap my-6">
        <div className="disclaimer-banner flex items-center gap-3 text-sm">
          <Info size={20} className="shrink-0 text-amber-700" />
          <span>
            <strong>Aviso de transparencia:</strong> Los resultados de este sondeo son referenciales y no tienen sustento científico.
          </span>
        </div>
      </aside>

      {/* Footer Azul Profundo (#0B2545) */}
      <footer className="main-footer">
        <div className="wrap">
          <div className="footer-grid">
            {/* Columna 1: Identidad */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-blue-900 flex items-center justify-center">
                  <Shield size={20} className="text-white" />
                </div>
                <div>
                  <strong className="text-white text-lg block leading-none">
                    {config?.nombre || "ENCUESTA RURAL"}
                  </strong>
                  <span className="text-xs text-slate-400 block mt-1">
                    {config?.subtitulo || "Sistema de Participación Ciudadana"}
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-300 max-w-sm leading-relaxed mt-3">
                Plataforma cívica independiente para conocer la opinión de los pobladores en centros poblados, comunidades y anexos de {distrito}.
              </p>
            </div>

            {/* Columna 2: Navegación */}
            <div>
              <h4 className="footer-title">Navegación</h4>
              <ul className="footer-links">
                <li>
                  <Link href="/">Inicio</Link>
                </li>
                <li>
                  <Link href="/participar">Participar en el sondeo</Link>
                </li>
                <li>
                  <Link href="/resultados">Ver resultados</Link>
                </li>
                <li>
                  <Link href="/informacion">Información y metodología</Link>
                </li>
              </ul>
            </div>

            {/* Columna 3: Ámbito territorial y Privacidad */}
            <div>
              <h4 className="footer-title">Ámbito Territorial</h4>
              <p className="text-sm text-slate-300 mb-2">
                Distrito: <strong className="text-white">{distrito}</strong>
              </p>
              <p className="text-sm text-slate-300 mb-4">
                Provincia de {provincia}, Departamento de {departamento}.
              </p>
              <div className="space-y-1 text-sm">
                <Link
                  href="/informacion#privacidad"
                  className="text-red-300 hover:text-white underline block"
                >
                  Aviso de privacidad y uso de datos
                </Link>
                <Link
                  href="/informacion"
                  className="text-slate-400 hover:text-white underline block"
                >
                  Información del sondeo
                </Link>
              </div>
            </div>
          </div>

          <div className="footer-bottom-row">
            <span>
              &copy; {new Date().getFullYear()} {config?.nombre || "Encuesta Rural"} · Sistema de Participación Ciudadana
            </span>
            <div className="flex items-center gap-4">
              <Link href="/informacion#privacidad" className="hover:text-white">
                Privacidad
              </Link>
              <Link href="/admin" className="hover:text-white">
                Administración
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
