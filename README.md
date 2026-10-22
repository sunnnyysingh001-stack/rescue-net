# RESCUE.NET
A disaster-response coordination portfolio project rebuilt in 2026. All incidents, locations and units in the seeded scenario are fictional. This is a demonstration, not an emergency reporting service.

[Live browser demo](https://rescue-net-sunny-demo.vercel.app) · [Portfolio](https://sunny-singh-sde-portfolio.vercel.app)

## Source layout
- `backend/src/main/java/dev/sunny/rescue/`: Java API, authentication, security, business rules and persistence.
- `backend/src/test/java/`: Java integration tests.
- `frontend/`: React/Next.js interface and browser simulation tests.
- `docs/`: architecture, API contract and verification limitations.

## Try it
The public demo is a browser simulation: report an incident, dispatch an available unit, allocate supplies, mark the unit on site, then resolve. Viewer mode demonstrates read-only interaction. Reset restores the sample scenario. Browser data stays on your device; changing the simulated role is not authentication.

The separate Java backend implements authenticated API access and durable state. It is not running on the static Vercel demo.

## Stack
- Next.js / React / TypeScript frontend, static export, responsive CSS and reduced-motion support.
- Java 17, Spring Boot 3.5.7, Spring Security JWT, Jakarta validation.
- H2 file persistence with transactional row locking.
- Node test runner and Spring Boot / MockMvc / JUnit integration tests.
- Docker Compose for a local same-origin deployment; GitHub Actions CI.

## Run the browser demo
Requires Node 22 and npm.
```sh
cd frontend
npm install
npm test
npm run dev
```
Open http://localhost:3000. Build with `npm run build`; static files are in `out/`.

## Run the full stack locally
Requires Docker with Compose.
Copy `.env.example` to `.env`. Replace every placeholder with unique random values. Generate the JWT secret with `openssl rand -hex 32`; use passwords of at least 12 characters.
```sh
docker compose up --build
```
Open http://localhost:8080 and choose **Connect Java API**. Sign in as `coordinator` or `viewer` using the corresponding password from your local environment. JWTs expire after 30 minutes and are held in memory. State survives container restarts in the Compose volume.

The API is intentionally bound to localhost. Before hosting it publicly, add managed identity, rate limits, TLS, backups, monitoring and an operational security review. Do not use real personal or emergency data.

## Backend development
Requires Java 17 and Maven 3.6.3+.
```sh
cd backend
mvn test
mvn package
```
Tests supply isolated credentials and an in-memory database. To run the server, export `JWT_SECRET`, `COORDINATOR_PASSWORD`, `VIEWER_PASSWORD`, then `mvn spring-boot:run`. The frontend is bundled by the Docker build; a standalone Maven build serves the API only.

## Engineering evidence
- [Architecture and tradeoffs](docs/architecture.md)
- [API contract](docs/api.md)
- Frontend: `frontend/tests/engine.test.mjs`
- Backend: `backend/src/test/java/dev/sunny/rescue/ApiTest.java`
- CI: `.github/workflows/ci.yml`
- [Screenshot guide](docs/screenshots.md)

Tests cover invalid input, viewer permissions, allocation limits, incident lifecycle, exclusive dispatch, persistence and concurrent team assignment. CI configuration is supplied; remote GitHub CI execution is not implied.

## Scope and next steps
The aggregate-row storage is deliberately simple and serializes writes. For multi-agency scale, normalize incidents, teams, allocations and events in PostgreSQL; add database constraints, pagination and an append-only audit store. Add idempotency keys, operator accounts, a real map provider and integration tests against the production database before extending the system.

This rebuild is separate from the original resume project and makes no claims about real deployments, users or rescue outcomes.
