export interface Config {
  id: number;
  nombre: string;
  subtitulo: string;
  logo_url: string | null;
  departamento: string;
  provincia: string;
  distrito: string;
  bienvenida: string;
  privacidad: string;
  privacidad_version: string;
  informacion_institucional: string;
  mostrar_resultados: boolean;
  responsable: string;
  ambito: string;
  metodo: string;
  financiacion: string;
  observaciones: string;
}
export interface Encuesta {
  id: string;
  titulo: string;
  descripcion: string;
  departamento: string;
  provincia: string;
  distrito: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: string;
  mostrar_resultados: boolean;
}
export interface Centro {
  id: string;
  nombre: string;
  tipo: string;
  activo: boolean;
  departamento: string;
  provincia: string;
  distrito: string;
  codigo: string | null;
}
export interface Candidato {
  id: string;
  encuesta_id: string;
  nombre_completo: string;
  cargo: string;
  organizacion_politica: string;
  foto_url: string | null;
  simbolo_url: string | null;
  numero_lista: string | null;
  descripcion: string | null;
  orden_visual: number;
  activo: boolean;
}
export interface Resultado {
  candidato_id: string;
  nombre_candidato: string;
  organizacion_politica: string;
  foto_url: string | null;
  simbolo_url: string | null;
  cantidad_respuestas: number;
  porcentaje: number;
}
export interface Resumen {
  total_participaciones: number;
  total_centros_poblados: number;
  total_comunidades: number;
  ultima_actualizacion: string | null;
}
export type Role = "SUPER_ADMIN" | "ADMIN" | "SUPERVISOR" | "VISUALIZADOR";
export interface Profile {
  id: string;
  nombre: string;
  rol: Role;
  activo: boolean;
}
export interface Catalog {
  config: Config;
  encuestas: Encuesta[];
  centros: Centro[];
  candidatos: Candidato[];
  connection?: { url: string; key: string };
}
