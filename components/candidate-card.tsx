"use client";
import { UserRound, Check } from "lucide-react";
import type { Candidato } from "@/lib/types";
export function CandidateCard({
  candidate: c,
  selected,
  onSelect,
}: {
  candidate: Candidato;
  selected?: boolean;
  onSelect?: () => void;
}) {
  return (
    <article className={`candidate-card ${selected ? "selected" : ""}`}>
      <div className="candidate-photo">
        {c.foto_url ? (
          <img
            src={c.foto_url}
            alt={`Fotografía de ${c.nombre_completo}`}
            loading="lazy"
          />
        ) : (
          <div className="photo-placeholder">
            <UserRound size={62} strokeWidth={1} />
            <span>Fotografía no cargada</span>
          </div>
        )}
      </div>
      <div className="candidate-body">
        <span className="tag">{c.cargo}</span>
        <h3>{c.nombre_completo}</h3>
        <p>{c.organizacion_politica}</p>
        <div className="candidate-symbol">
          {c.simbolo_url ? (
            <img
              src={c.simbolo_url}
              alt={`Símbolo de ${c.organizacion_politica}`}
              loading="lazy"
            />
          ) : (
            <span>SÍMBOLO NO CARGADO</span>
          )}
        </div>
        {c.numero_lista && (
          <p className="list-number">Lista {c.numero_lista}</p>
        )}
        {c.descripcion && (
          <p className="candidate-description">{c.descripcion}</p>
        )}
        {onSelect && (
          <button
            type="button"
            aria-pressed={selected}
            className={`button ${selected ? "" : "secondary"}`}
            onClick={onSelect}
          >
            {selected ? (
              <>
                <Check size={17} /> Opción seleccionada
              </>
            ) : (
              "Seleccionar"
            )}
          </button>
        )}
      </div>
    </article>
  );
}
