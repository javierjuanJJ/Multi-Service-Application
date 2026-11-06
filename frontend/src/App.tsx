import { useCallback, useEffect, useState } from "react";
import { fetchApiStatus, resolveApiBaseUrl } from "./lib/api";

type Probe =
  | { state: "checking" }
  | { state: "online"; message: string; latencyMs: number }
  | { state: "offline"; error: string };

interface ServiceRow {
  name: string;
  role: string;
  tech: string;
}

const endpoint = `${resolveApiBaseUrl(import.meta.env.VITE_API_URL)}/`;

const flow = [
  { name: "Navegador", detail: "Cliente React" },
  { name: "Nginx", detail: "Proxy en el puerto 80" },
  { name: "API", detail: "Express en el puerto 4000" },
  { name: "Datos", detail: "MongoDB y Redis" },
] as const;

const services: ServiceRow[] = [
  { name: "web", role: "Interfaz de usuario", tech: "React 18, TypeScript, Vite" },
  { name: "proxy", role: "Enrutado HTTP", tech: "Nginx" },
  { name: "api", role: "Servicio HTTP", tech: "Express, Node.js 18" },
  { name: "db", role: "Persistencia", tech: "MongoDB 7" },
  { name: "redis", role: "Caché", tech: "Redis 7" },
];

function describeError(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return "La comprobación se canceló.";
    }

    if (error.message === "Failed to fetch") {
      return "No se pudo conectar con el endpoint.";
    }

    return error.message;
  }

  return "Error desconocido.";
}

function flowMarkerClass(name: string, state: Probe["state"]): string {
  if (name !== "API") {
    return "border-line bg-paper";
  }

  if (state === "online") {
    return "border-online bg-online";
  }

  if (state === "offline") {
    return "border-signal bg-signal";
  }

  return "border-steel bg-steel animate-pulse";
}

export default function App() {
  const [probe, setProbe] = useState<Probe>({ state: "checking" });
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  const check = useCallback((signal?: AbortSignal) => {
    setProbe({ state: "checking" });
    const startedAt = performance.now();

    fetchApiStatus(signal)
      .then((payload) => {
        setProbe({
          state: "online",
          message: payload.message,
          latencyMs: Math.round(performance.now() - startedAt),
        });
        setCheckedAt(new Date());
      })
      .catch((error: unknown) => {
        if (signal?.aborted) {
          return;
        }

        setProbe({ state: "offline", error: describeError(error) });
        setCheckedAt(new Date());
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    check(controller.signal);

    return () => controller.abort();
  }, [check]);

  const headline =
    probe.state === "online"
      ? "API en línea"
      : probe.state === "offline"
        ? "API sin respuesta"
        : "Comprobando la API";

  const detail =
    probe.state === "online"
      ? `El endpoint respondió: “${probe.message}”.`
      : probe.state === "offline"
        ? `${probe.error} Verifica que los contenedores estén en marcha.`
        : `Esperando respuesta de ${endpoint}.`;

  const latency = probe.state === "online" ? `${probe.latencyMs} ms` : "—";

  const dotClass =
    probe.state === "online"
      ? "bg-online"
      : probe.state === "offline"
        ? "bg-signal"
        : "bg-steel animate-pulse";

  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-6 py-5">
          <span className="font-mono text-sm font-medium">multi-service-application</span>
          <span className="text-xs text-steel">Node 18 / Docker Compose</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
          <section aria-labelledby="page-title">
            <h1
              id="page-title"
              className="max-w-xl text-4xl font-semibold leading-[1.08] tracking-[-0.02em] sm:text-5xl"
            >
              Cinco servicios,
              <br />
              un solo stack.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-steel">
              React, Express, MongoDB, Redis y Nginx trabajando en local. Esta página
              comprueba en vivo que la API responde a través del proxy.
            </p>

            <ol className="mt-10 grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
              {flow.map((node) => (
                <li key={node.name} className="relative border-t border-line pt-4">
                  <span
                    aria-hidden="true"
                    className={`absolute -top-[5px] left-0 h-2.5 w-2.5 border ${flowMarkerClass(node.name, probe.state)}`}
                  />
                  <p className="text-sm font-medium">{node.name}</p>
                  <p className="mt-1 text-sm leading-snug text-steel">{node.detail}</p>
                </li>
              ))}
            </ol>
          </section>

          <section
            aria-labelledby="status-title"
            className="stack-grid self-start border border-line bg-panel p-6 sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 id="status-title" className="text-sm font-medium text-steel">
                  Estado de la API
                </h2>
                <div role="status" aria-live="polite" className="mt-3">
                  <p className="flex items-center gap-3 text-2xl font-semibold">
                    <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 ${dotClass}`} />
                    {headline}
                  </p>
                  <p className="mt-2 min-h-[3rem] text-sm leading-relaxed text-steel">
                    {detail}
                  </p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono text-3xl tabular-nums">{latency}</p>
                <p className="mt-1 text-xs text-steel">latencia</p>
              </div>
            </div>

            <dl className="mt-6 space-y-3 border-t border-line pt-5 text-sm">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-steel">Endpoint</dt>
                <dd className="truncate font-mono text-xs">GET {endpoint}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-steel">Última comprobación</dt>
                <dd className="font-mono text-xs tabular-nums">
                  {checkedAt ? checkedAt.toLocaleTimeString("es-ES", { hour12: false }) : "—"}
                </dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={() => check()}
              disabled={probe.state === "checking"}
              className="mt-6 inline-flex w-full items-center justify-center border border-ink bg-ink px-4 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-steel disabled:cursor-not-allowed disabled:opacity-60"
            >
              Volver a comprobar
            </button>
          </section>
        </div>

        <section aria-labelledby="services-title" className="mt-16">
          <h2 id="services-title" className="text-2xl font-semibold tracking-[-0.01em]">
            Servicios del stack
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-steel">
            La API es el único servicio que esta página consulta directamente. MongoDB y
            Redis se supervisan mediante los healthchecks de Docker Compose.
          </p>

          <ul className="mt-6 divide-y divide-line border-y border-line">
            {services.map((service) => (
              <li
                key={service.name}
                className="grid grid-cols-[5rem_1fr] items-baseline gap-x-4 gap-y-1 py-4 sm:grid-cols-[7rem_1fr_1fr]"
              >
                <span className="font-mono text-sm font-medium">{service.name}</span>
                <span className="text-sm">{service.role}</span>
                <span className="col-start-2 text-sm text-steel sm:col-start-3">
                  {service.tech}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="mt-20 border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-6 py-8 text-sm text-steel sm:flex-row sm:items-center sm:justify-between">
          <p>React 18, TypeScript y Vite sobre Node.js 18.</p>
          <p>
            Ejecuta <code className="font-mono text-xs text-ink">docker compose up -d</code>{" "}
            para levantar el stack.
          </p>
        </div>
      </footer>
    </div>
  );
}
