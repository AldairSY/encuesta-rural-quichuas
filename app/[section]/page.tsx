import { notFound } from "next/navigation";
import { publicData } from "@/lib/server";
import { PublicShell } from "@/components/public-shell";
import { Participation } from "@/components/participation";
import { PublicResults } from "@/components/public-results";
import { peruDate } from "@/lib/client";
export const dynamic = "force-dynamic";
export default async function PublicPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!["participar", "resultados", "informacion"].includes(section))
    notFound();
  const data = await publicData(),
    c = data.config;
  const title =
    section === "participar"
      ? "Participa en el sondeo"
      : section === "resultados"
        ? "Resultados del sondeo"
        : "Información del sondeo";
  return (
    <PublicShell config={c}>
      <section className="page-head">
        <div className="wrap">
          <span className="eyebrow blue">
            ENCUESTA RURAL · SONDEO DE OPINIÓN
          </span>
          <h1>{title}</h1>
          <p>
            {c
              ? `${c.distrito} · ${c.provincia} · ${c.departamento}`
              : "Información no disponible"}
          </p>
        </div>
      </section>
      <main className="wrap page-content">
        {section === "participar" ? (
          <Participation />
        ) : section === "resultados" ? (
          <PublicResults />
        ) : (
          <div className="information-grid">
            <section className="panel">
              <h2>Transparencia y alcance</h2>
              <p>
                {c?.informacion_institucional ||
                  "La información institucional aún no ha sido completada por la administración."}
              </p>
              <dl>
                {[
                  ["Responsable", c?.responsable],
                  ["Ámbito", c?.ambito],
                  ["Método de recolección", c?.metodo],
                  ["Financiación", c?.financiacion],
                  ["Observaciones", c?.observaciones],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v || "No informado"}</dd>
                  </div>
                ))}
              </dl>
              <p>
                La participación es voluntaria. No se afirma representatividad
                estadística ni validación oficial de identidad.
              </p>
              {data.encuestas.map((e) => (
                <div className="survey-info" key={e.id}>
                  <h3>{e.titulo}</h3>
                  <p>{e.descripcion}</p>
                  <p>
                    Inicio: {peruDate(e.fecha_inicio)}
                    <br />
                    Cierre: {peruDate(e.fecha_fin)}
                  </p>
                  <span className="tag">{e.estado}</span>
                </div>
              ))}
              <p>
                Participaciones válidas publicadas:{" "}
                {data.resumen?.total_participaciones ?? "No disponibles"}
              </p>
            </section>
            <section className="panel" id="privacidad">
              <h2>Privacidad de tus datos</h2>
              <p className="preserve-lines">
                {c?.privacidad ||
                  "El aviso de privacidad no está disponible en este momento."}
              </p>
              <p>Versión: {c?.privacidad_version || "—"}</p>
              <p>
                Las señales de conexión y dispositivo se utilizan para prevenir
                abuso. Las coincidencias se revisan; compartir una conexión no
                implica que dos personas sean la misma.
              </p>
              <p>
                La consulta pública muestra únicamente resultados agregados.
              </p>
            </section>
          </div>
        )}
      </main>
    </PublicShell>
  );
}
