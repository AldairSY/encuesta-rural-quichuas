export async function api<T = Record<string, unknown>>(
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`/api/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(
      (data as { message?: string }).message ||
        "No se pudo completar la operación.",
    );
  return data as T;
}
export const peruDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("es-PE", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/Lima",
      }).format(new Date(value))
    : "Sin definir";

export function normalizedText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}
export function normalizePercentages(values: number[]) {
  const sum = values.reduce((a, b) => a + b, 0);
  if (!sum)
    return values.map(
      (_, i) =>
        Math.floor(
          10000 / values.length + (i < 10000 % values.length ? 1 : 0),
        ) / 100,
    );
  const raw = values.map((v) => (v / sum) * 10000);
  const base = raw.map(Math.floor);
  const remainder = 10000 - base.reduce((a, b) => a + b, 0);
  const order = raw
    .map((v, i) => ({ i, part: v - base[i] }))
    .sort((a, b) => b.part - a.part || a.i - b.i);
  for (let n = 0; n < remainder; n++) base[order[n].i]++;
  return base.map((v) => v / 100);
}
