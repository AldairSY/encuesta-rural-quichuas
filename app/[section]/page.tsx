import { notFound } from "next/navigation";
import { publicData } from "@/lib/server";
import { PublicShell } from "@/components/public-shell";
import { Participation } from "@/components/participation";
import { PublicResults } from "@/components/public-results";
import { peruDate } from "@/lib/client";
import { ShieldCheck, Info, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PublicPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!["participar", "resultados", "informacion"].includes(section))
    notFound();

  const data = await publicData();
  const c = data.config;

  const distrito = c?.distrito || "Andamarca";
  const provincia = c?.provincia || "Concepción";
  const departamento = c?.departamento || "Junín";

  return (
    <PublicShell config={c}>
      <div className="wrap py-8 sm:py-12 min-h-[60vh]">
        {section === "participar" ? (
          <Participation />
        ) : section === "resultados" ? (
          <PublicResults />
        ) : (
          <div className="max-w-5xl mx-auto">
            {/* Cabecera de Información */}
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0B2545] tracking-tight">
                Información y Transparencia
              </h1>
              <p className="text-base text-[#475569] mt-1">
                Metodología, ámbito y protección de datos · {distrito}, {provincia}, {departamento}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Panel de Metodología y Transparencia */}
              <div className="lg:col-span-7 space-y-6">
                <section className="bg-white border border-[#E2E8F0] rounded-[20px] p-6 sm:p-8 shadow-xs">
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#E2E8F0]">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#12355B] flex items-center justify-center shrink-0">
                      <Info size={22} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-[#0B2545]">
                        Metodología del Sondeo
                      </h2>
                      <span className="text-xs text-slate-500 font-medium">Transparencia comunal</span>
                    </div>
                  </div>

                  <p className="text-sm sm:text-base text-[#475569] leading-relaxed mb-6">
                    {c?.informacion_institucional ||
                      "Este sondeo de opinión cívica tiene como finalidad conocer las preferencias de los ciudadanos de los diferentes centros poblados y comunidades de manera abierta y voluntaria."}
                  </p>

                  <div className="space-y-3 mb-6 bg-[#F7F9FC] p-5 rounded-xl border border-[#E2E8F0]">
                    {[
                      ["Responsable", c?.responsable],
                      ["Ámbito territorial", c?.ambito || `${distrito} - ${provincia}`],
                      ["Método de recolección", c?.metodo || "Plataforma digital con validación de DNI"],
                      ["Financiación", c?.financiacion || "Independiente"],
                      ["Observaciones", c?.observaciones || "Sondeo de carácter referencial"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex flex-col sm:flex-row sm:justify-between py-1.5 border-b border-[#E2E8F0]/60 last:border-0 text-sm">
                        <span className="font-bold text-slate-600">{k}:</span>
                        <span className="text-[#0B2545] font-semibold text-left sm:text-right">{v || "No especificado"}</span>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs sm:text-sm text-amber-900 leading-relaxed mb-6">
                    <strong>Nota sobre representatividad:</strong> La participación es voluntaria y libre. No se afirma representatividad estadística ni validación oficial de identidad mediante organismos electorales oficiales.
                  </div>

                  {/* Lista de Sondeos */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                      Sondeos registrados
                    </h3>
                    {data.encuestas.map((enc) => (
                      <div
                        className="p-5 rounded-xl border border-[#E2E8F0] bg-[#F7F9FC]"
                        key={enc.id}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className="font-bold text-[#0B2545] text-base">{enc.titulo}</h4>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${enc.estado === "ACTIVA" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>
                            {enc.estado}
                          </span>
                        </div>
                        {enc.descripcion && (
                          <p className="text-xs sm:text-sm text-slate-600 mb-2">{enc.descripcion}</p>
                        )}
                        <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1 pt-1">
                          <span><strong>Inicio:</strong> {peruDate(enc.fecha_inicio)}</span>
                          <span><strong>Cierre:</strong> {peruDate(enc.fecha_fin)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {/* Panel de Privacidad y Tratamiento de Datos */}
              <div className="lg:col-span-5 space-y-6">
                <section className="bg-white border border-[#E2E8F0] rounded-[20px] p-6 sm:p-8 shadow-xs" id="privacidad">
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#E2E8F0]">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
                      <ShieldCheck size={22} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-[#0B2545]">
                        Privacidad de Datos
                      </h2>
                      <span className="text-xs text-slate-500 font-medium">Tratamiento confidencial</span>
                    </div>
                  </div>

                  <div className="text-sm text-[#475569] leading-relaxed space-y-4">
                    <div className="bg-[#F7F9FC] p-4 rounded-xl border border-[#E2E8F0] font-medium text-slate-800">
                      {c?.privacidad ||
                        "Tus datos personales no se mostrarán públicamente. Los resultados públicos se presentan de forma agregada."}
                    </div>

                    <div className="space-y-3 text-xs sm:text-sm text-slate-600">
                      <p className="flex items-start gap-2">
                        <span className="text-[#12355B] font-bold">•</span>
                        <span>
                          <strong>Prevención de duplicidad:</strong> El número de DNI se utiliza exclusivamente para validar que una persona participe una sola vez.
                        </span>
                      </p>
                      <p className="flex items-start gap-2">
                        <span className="text-[#12355B] font-bold">•</span>
                        <span>
                          <strong>Control de abusos:</strong> Se emplean señales técnicas de conexión para prevenir registros automatizados.
                        </span>
                      </p>
                      <p className="flex items-start gap-2">
                        <span className="text-[#12355B] font-bold">•</span>
                        <span>
                          <strong>Resultados públicos:</strong> Únicamente se muestran conteos y porcentajes agregados por opción y por comunidad.
                        </span>
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 text-xs text-slate-400">
                      Versión del aviso: {c?.privacidad_version || "1.0"}
                    </div>
                  </div>
                </section>

                {/* Orientación al Poblador */}
                <div className="bg-[#F7F9FC] rounded-[18px] border border-[#E2E8F0] p-6 text-sm text-[#475569]">
                  <div className="flex items-center gap-2 font-bold text-[#0B2545] mb-2">
                    <FileText size={18} className="text-[#12355B]" />
                    <span>¿Tienes dudas sobre cómo participar?</span>
                  </div>
                  <p className="leading-relaxed text-xs sm:text-sm">
                    El proceso es completamente gratuito y no requiere instalación de aplicaciones. Si necesitas orientación, puedes pedir apoyo a una persona de tu confianza en tu caserío o comunidad.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PublicShell>
  );
}
