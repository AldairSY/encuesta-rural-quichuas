import Link from "next/link";
import {
  ArrowUpRight,
  MapPin,
  ShieldCheck,
  ClipboardList,
  BarChart3,
  Users,
  Landmark,
  Clock3,
} from "lucide-react";
import { publicData } from "@/lib/server";
import { PublicShell } from "@/components/public-shell";

export const dynamic = "force-dynamic";
export default async function Home() {
  const data = await publicData();
  const c = data.config;
  const metrics = [
    {
      Icon: Users,
      label: "Participaciones válidas",
      value: data.resumen?.total_participaciones,
    },
    {
      Icon: Landmark,
      label: "Centros Poblados",
      value: data.resumen?.total_centros_poblados,
    },
    {
      Icon: MapPin,
      label: "Comunidades",
      value: data.resumen?.total_comunidades,
    },
    {
      Icon: Clock3,
      label: "Última actualización",
      value: data.resumen?.ultima_actualizacion
        ? new Date(data.resumen.ultima_actualizacion).toLocaleDateString(
            "es-PE",
            { timeZone: "America/Lima" },
          )
        : "Sin registros",
    },
  ];
  return (
    <PublicShell config={c}>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <span className="eyebrow">
              PARTICIPACIÓN CIUDADANA · SONDEO DE OPINIÓN
            </span>
            <h1>
              Tu comunidad.
              <br />
              Tu voz.
              <br />
              <em>Tu participación.</em>
            </h1>
            <p className="hero-copy">
              {c?.bienvenida ||
                "Participa en el sondeo de opinión de tu distrito, Centro Poblado o Comunidad."}
            </p>
            <div className="hero-actions">
              <Link className="button light" href="/participar">
                Participar en la encuesta <ArrowUpRight size={20} />
              </Link>
              <Link className="text-link" href="/resultados">
                Ver resultados <BarChart3 size={18} />
              </Link>
            </div>
            <div className="hero-location">
              <MapPin size={18} />
              {c
                ? `${c.distrito} · ${c.provincia} · ${c.departamento}`
                : "Ubicación no disponible"}
            </div>
          </div>
          <aside className="participation-note">
            <span className="note-number">01 / PARTICIPA</span>
            <ClipboardList size={48} strokeWidth={1.1} />
            <h2>
              Una opinión que
              <br />
              cuenta.
            </h2>
            <p>
              Elige una opción y contribuye a conocer la opinión de tu
              comunidad.
            </p>
            <div className="note-status">
              {data.encuestas.length
                ? "Consulta los sondeos disponibles"
                : "Próxima apertura del sondeo"}
            </div>
            <div className="note-bottom">
              <ShieldCheck size={20} />
              <span>
                Tus datos personales
                <br />
                no se muestran públicamente.
              </span>
            </div>
          </aside>
        </div>
      </section>
      <section className="wrap">
        <div className="metrics">
          {metrics.map(({ Icon, label, value }) => (
            <div className="metric" key={label}>
              <Icon size={20} />
              <strong>{value ?? "—"}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
        {data.error && (
          <p className="notice" role="alert">
            No se pudo consultar el sondeo. Intenta actualizar la página.
          </p>
        )}
        <section className="intro">
          <div>
            <span className="eyebrow blue">UNA PARTICIPACIÓN INFORMADA</span>
            <h2>
              Un proceso claro,
              <br />
              de principio a fin.
            </h2>
            <p>
              Este es un sondeo de opinión independiente. No es una plataforma
              oficial del JNE ni de la ONPE.
            </p>
            <Link className="inline-link" href="/informacion">
              Conocer el sondeo <ArrowUpRight size={18} />
            </Link>
          </div>
          <ol className="process-list">
            <li>
              <span>01</span>
              <div>
                <h3>Registra tus datos</h3>
                <p>
                  Ingresa tu DNI, nombres y comunidad. Comprobamos formato y
                  duplicidad, sin verificación oficial de identidad.
                </p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <h3>Selecciona una opción</h3>
                <p>
                  Revisa las opciones disponibles. Todas reciben el mismo
                  tratamiento.
                </p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <h3>Confirma tu participación</h3>
                <p>
                  Revisa tu selección antes de enviarla. Cada DNI puede
                  registrarse una sola vez.
                </p>
              </div>
            </li>
          </ol>
        </section>
      </section>
    </PublicShell>
  );
}
