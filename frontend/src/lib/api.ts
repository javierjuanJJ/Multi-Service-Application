export interface ApiPayload {
  message: string;
}

/**
 * Normaliza la URL base de la API.
 *
 * En producción no se define VITE_API_URL: el navegador llama a `/api/` y
 * Nginx reenvía la petición al contenedor `api`.
 */
export function resolveApiBaseUrl(raw: string | undefined): string {
  const value = raw?.trim();

  if (!value) {
    return "/api";
  }

  return value.replace(/\/+$/, "");
}

export async function fetchApiStatus(signal?: AbortSignal): Promise<ApiPayload> {
  const response = await fetch(`${resolveApiBaseUrl(import.meta.env.VITE_API_URL)}/`, {
    signal,
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`El endpoint respondió con HTTP ${response.status}.`);
  }

  const data: unknown = await response.json();

  if (!isApiPayload(data)) {
    throw new Error("La respuesta de la API no tiene el formato esperado.");
  }

  return data;
}

function isApiPayload(value: unknown): value is ApiPayload {
  if (typeof value !== "object" || value === null || !("message" in value)) {
    return false;
  }

  return typeof (value as { message: unknown }).message === "string";
}
