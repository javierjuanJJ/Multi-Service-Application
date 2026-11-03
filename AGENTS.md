# Multi-Service Application — AGENTS.md (TypeScript Frontend)

This repo contains a multi-service Docker application with a **React + TypeScript** frontend, Node.js API, MongoDB, Redis, and Nginx reverse proxy. Read this before running any Docker commands.

## Project Structure

| Directory | Purpose |
|---|---|
| `frontend/` | React app with TypeScript (tsconfig.json, src/) |
| `backend/` | Node.js Express API |
| `docker/` | Docker configs (nginx, base image) |
| `docker-compose.yml` | Main compose file orchestrating all services |

## Key Commands

| Action | Command |
|---|---|
| Build all services | `docker-compose build` |
| Start all services | `docker-compose up -d` |
| Stop all services | `docker-compose down` |
| View logs (all services) | `docker-compose logs -f` |
| View logs (specific service) | `docker-compose logs -f <service>` |
| Rebuild a specific service | `docker-compose up --build -d <service>` |
| Run shell inside a service | `docker-compose exec <service> sh` |
| Run shell inside web container | `docker-compose exec web sh` |
| Run shell inside api container | `docker-compose exec api sh` |
| Run shell inside db container | `docker-compose exec db sh` |
| Run shell inside redis container | `docker-compose exec redis sh` |

## Service Communication

- All services on Docker bridge network `app-network`
- Services discover each other by hostname (e.g., `api`, `db`, `redis`, `web`, `proxy`)
- Nginx proxy on host port 80 routes to:
  - `/` → web frontend (TypeScript-compiled static assets)
  - `/api/` → API service
- Internal API ports exposed: API on 4000 (accessible as `api:4000` internally)
- Database: `mongodb://db:27017/app`
- Cache: `redis://redis:6379`

## TypeScript Frontend Notes

- `frontend/tsconfig.json` configures compilation; DO NOT remove `strict: true`
- `frontend/src/` contains all `.tsx`/`.ts` source files
- `pnpm run build` in frontend generates JavaScript in `build/` served by Nginx
- Type errors surface during `docker-compose up --build` if `pnpm run build` is hooked
- IDE/editor may auto-fix imports; ensure paths resolve at runtime via `docker-compose exec web sh`
- Never edit built JS in `build/` directly — it is regenerated from source on rebuild

## Volumes (Persistent Data)

| Volume | Service | Purpose |
|---|---|---|
| `db-data` | MongoDB | Persistent database data |
| `redis-data` | Redis | Persistent cache data |
| `web-static` | Nginx | Built frontend static files (read-only, regenerated on rebuild) |
| `api-logs` | API service | Service log files |

**Do not delete volumes** unless you want to lose persistent data. Use `docker-compose down -v` only if data loss is acceptable.

## Health Checks

Each service defines health checks in its Dockerfile/compose. Key endpoints:

- `web`: `http://localhost/` (Nginx healthcheck via wget; serves `/index.html` SPA fallback)
- `api`: `http://localhost:4000/health` (returns `{"status":"ok"}`)
- `db`: MongoDB ping via mongosh
- `redis`: `redis-cli ping` → `PONG`

**Usage**: `docker-compose ps` shows service status (healthy/unhealthy/starting). Use `docker-compose ps --filter "health=unhealthy"` to find failing services.

## Secrets

Sensitive values (DB passwords, Redis URLs) should be loaded from `.env` **never** committed to repo. The `.env.example` file shows required variables.

**To add a new secret:**
1. Add to `.env` (local) or Docker secrets (production)
2. Reference in `docker-compose.yml` via `env_file` or `environment`
3. Never hardcode secrets in Dockerfiles or compose files

For Docker Swarm/Kubernetes production mode, create secrets with:
```bash
echo "my-password" | docker secret create db-password -
```

## Multi-Stage Builds

- **Web (Dockerfile.web)**: Builder stage installs deps + runs `pnpm run build` (TypeScript compilation). Final stage uses `nginx:alpine` with only the build output. Smaller final image.
- **API (Dockerfile.api)**: Builder stage installs deps. Final stage copies only `node_modules` and `app/` from builder. Uses `node:18-alpine` runtime.

**Build order matters**: `docker-compose build` builds in dependency order. Rebuild individual services with `--build` flag.

## Logging & Log Rotation

Services use Docker's `json-file` driver with rotation configured in `docker-compose.yml`:

```yaml
logging:
  driver: json-file
  options:
    max-size: 10m
    max-file: 3
```

**To view logs**: `docker-compose logs -f <service>`
**To rotate manually**: `docker-compose kill -s SIGUSR2 <service>` (SIGUSR2 triggers log rotation for json-file driver)

## Common Gotchas

1. **Network first**: If services can't see each other, check `docker-compose ps` and that all services share the `app-network`.
2. **Volume permissions**: `db-data` and `redis-data` owned by container users. Use `docker-compose exec db sh` to inspect if needed.
3. **Cache invalidation**: Redis data persists via volume, but `docker-compose down -v` will delete it.
4. **Nginx config**: Custom config in `docker/nginx/default.conf`. Rebuild proxy after changes.
5. **TypeScript build**: `pnpm run build` compiles `.ts`/`.tsx` → static assets in `build/`. If the build fails, the container won't start.
6. **Health check timing**: Services need startup time before health checks pass. Use `docker-compose ps` to verify they're `healthy` before sending dependent traffic.
7. **Source maps**: `docker-compose build` does NOT include source maps by default; add `sourceMap: false` to `tsconfig.json` if bundle size matters.

## Development Workflow

1. `docker-compose up -d` starts all services
2. Frontend: TypeScript compiles on `pnpm run build`; Nginx serves the resulting `build/` assets
3. API code changes: rebuild with `docker-compose up --build -d api`
4. Use `docker-compose exec api sh` to debug running container
5. Run local dev: `cd backend && pnpm run dev` (bypasses Docker if needed, but Docker is preferred for consistency)
6. If TypeScript errors appear, run `docker-compose build --no-cache` to force full rebuild

## When Something Breaks

- `docker-compose logs -f` — first line of diagnosis
- `docker-compose ps` — check health status
- `docker-compose top` — verify processes running
- `docker system prune -a` — cleanup unused images (use with caution)
- Check individual container: `docker logs <container_id>`
- If frontend breaks: `docker-compose exec web sh` → `cd usr/share/nginx/html` → verify built files exist
- If TypeScript errors: check `frontend/tsconfig.json` and `pnpm run build` output
