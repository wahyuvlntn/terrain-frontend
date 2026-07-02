# Digital Twin AFDD

A standalone React application for digital twin monitoring, automated fault detection and diagnostics,
asset management, maintenance, simulation, and AI plant assistance.

The frontend has one package, one Vite configuration, and one application. Shared components are
local source files; there is no workspace manager or separate mobile application.

## Development

Requires Node.js 22 and npm. Start the backend from `../chiller-digital-twin-backend` first.

```sh
npm ci
npm run dev
```

Open http://localhost:4200. Vite proxies `/api` and `/public` to `https://localhost:4500`
in both development and preview mode.
Copy `.env.example` to `.env.local` to customize the backend, project aliases, or MQTT connection.
Use matching aliases and MQTT credentials on both sides. A direct `VITE_API_URL` requires backend CORS.
The direct MQTT TLS connection requires trusting the backend certificate in the browser.

```sh
npm run build      # production files in dist/
npm run preview    # preview production files on port 4300
npm test           # Vitest tests
npm run typecheck  # TypeScript checks
```

Run `npm run build` before `npm run preview`, and rebuild after changing source files or build-time
environment variables. Preview serves the latest `dist/` build at http://localhost:4300 and uses
the same backend proxy as development. The backend must be running a matching version.
Use Docker or the backend's `STATIC_DIR` for production serving.

## Structure

- `src/`: application entry, routes, pages, and feature components.
- `src/shared/components/`: common components and administration features.
- `src/shared/ui/`: local UI primitives and styles.
- `src/shared/utils/`: API clients, translations, theme helpers, and utilities.
- `src/shared/assets/`: icons, fonts, images, and audio.
- `public/`: static files, service worker, and digital twin GLB models.

## FAB1 digital twin

The FAB1 facility model uses the existing equipment inventory:

- `FAB1 L1 Sub-Fab`: Bay A (Etch), dry pumps DP-01..03; Bay B (CVD), dry pumps DP-04..06.
- `FAB1 L4 Mechanical Deck`: North MAU room, MAU-01..03; South MAU room, MAU-04..06.

The `FAB1 Wafer Fab` building view adds the L2 cleanroom with six process tools (ETCH-01..03,
CVD-01..03, each standing over the dry pump it uses), overhead wafer transport, stockers, the L3
FFU deck and utility plenum, the roof, and as site context the pipe bridge from the CUB and the
CUB massing (the CUB building view shows the bridge and the FAB1 massing in turn). The process
tools have no backend records: their foreline gauge shows the live inlet pressure of the dry pump
below, and their wafer robots run while that pump runs.

The layout is a representative facility model, with the mechanical deck 12.6 m above the sub-fab.
Equipment, instrument values, status, alarms, and dashboards bind to the existing backend aliases.
Model placement and bindings are in `src/pages/digital-twin/digital-twin.scenes.ts` and
`digital-twin.bindings.ts`; the generated assets use the `fab1-` prefix in `public/models/digital-twin/`.
The editable Blender source and generator are in `../chiller-digital-twin/blender/fab_twin_scripts/`.
Wafer lots, production flow and product quality data are a subsequent extension.

## 3D viewer options

- **See-through walls** (eye button in the twin toolbar, remembered per browser): on, building
  walls, slabs, roofs and doors are translucent; off, they are solid (glass stays transparent).
  With solid walls, structures block clicks and the walk-mode crosshair, and in the orbit view the
  walls between the camera and the selected equipment fade so the selection stays visible.
- Structure models are batched per subsystem and material when they load (one draw call each),
  so building-level views stay responsive.

## Docker

Run the complete application from the backend directory:

```sh
cd ../chiller-digital-twin-backend
docker compose --profile demo up -d --build
```

Open http://localhost:8082. The frontend proxies API, file, and MQTT traffic to the backend.
Omit `--profile demo` to run without the sample plant simulator.

To run just the frontend against an already running backend:

```sh
docker compose up -d --build
```

`BACKEND_UPSTREAM` and `MQTT_UPSTREAM` select the backend at container startup. `FRONTEND_PORT`
defaults to 8082. The single Dockerfile builds with Node and serves `dist/` with nginx; no private
registry or checked-in TLS key is required. For custom aliases or MQTT credentials, set the
matching Vite build arguments and backend environment variables before building.

## Upgrade

Rebuild the frontend, backend, simulator, and AI services together. Sign in again after upgrading;
the session header is `X-AFDD-Session-Id` and login returns `session_id`. Defaults are organization
`local`, project `digital_twin_afdd`, MQTT user `afdd_ui`, and notification topic `AFDD_NOTIFICATION`.
Existing devices publishing to a previous project namespace need their topic updated, or matching
`ORG_ALIAS` / `PROJECT_ALIAS` overrides on both frontend and backend. Existing asset and maintenance
data is retained. Equipment manufacturer names describe the equipment independently of the app name.

When running the frontend locally with `dev` or `preview`, update the backend services from the
backend directory with:

```sh
docker compose --profile demo build backend simulator ai-agent
docker compose --profile demo up -d --no-deps backend simulator ai-agent ai-mcp ai-analytics
```

If a previous failed login left a nested `redirect-url`, open `/signin` directly after upgrading.
