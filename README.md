# GTSDB Cloud ☁️

A **freemium, managed timeseries database platform** built on the open-source
[GTSDB](https://github.com/abbychau/gtsdb) engine. It is a complete
"DBaaS-style" control plane: authentication, instance management, data
explorer, query console, keys management, usage analytics, plans & billing —
with **Firebase Authentication** (Email + Google) out of the box.

> The underlying GTSDB engine is a WAL-first timeseries database with
> sub-millisecond reads and 233× faster writes than InfluxDB. GTSDB Cloud puts
> a modern web console in front of it.

![Stack](https://img.shields.io/badge/stack-Next.js%2014%20·%20shadcn%2Fui%20·%20Firebase%20·%20Tailwind-blue)

---

## ✨ Features

| Area | What you get |
|------|--------------|
| **Auth** | Firebase Authentication — Email + Google sign-in, demo mode fallback |
| **Instances** | Create/manage "instances" that map to GTSDB servers, with regions, plans and connection tokens |
| **Data Explorer** | Browse series, query by *last N* or *time range*, downsampling + 11 aggregations, live charts & CSV export |
| **Write tooling** | Single-point writes, batch CSV import (data-patch) |
| **Keys manager** | Create / rename / delete / compact / reload series |
| **API Console** | Connection details + copy-paste snippets in **cURL, Node.js, Python, Go** |
| **Usage analytics** | Data points, series, reads/writes per instance; `serverinfo` telemetry |
| **Freemium billing** | Free / Pro / Team plans with quota gating, usage meters, invoices (simulated) |
| **Sandbox** | Every instance ships with a built-in **GTSDB simulator** so the whole product is explorable without a live server |
| **Docs** | Full quickstart + REST/TCP reference page |

## 🚀 Quick start

```bash
# 1. Install
npm install

# 2. Configure Firebase (optional — see below)
cp .env.local.example .env.local
# ... fill in your Firebase web app config and GTSDB_ADMIN_TOKEN ...

# 3. Run the whole stack together (portal + managed GTSDB)
npm run dev:all
# -> portal  http://localhost:13000   ·   GTSDB  http://localhost:5556
```

`npm run dev:all` starts the Next.js portal **and** the shared, multi-tenant
GTSDB server (via `gtsdb.local.ini`) together using `concurrently` — Ctrl+C
stops both. Use `npm run dev` for the portal alone, or `npm run start:all` for
the built app + GTSDB.

Open the app, sign in, click **New instance** — the platform provisions a real,
isolated tenant namespace (GTSDB user) on the shared server via `adduser`, and
gives you its connection credential. Clients connect straight to the managed
endpoints (`GTSDB_PUBLIC_HTTP_URL` / `GTSDB_PUBLIC_TCP_URL`).

### Managing the shared GTSDB server

- The platform manages **one** GTSDB server on behalf of all users. Each
  platform instance = one GTSDB user (tenant namespace) created with `adduser`,
  isolated automatically (tenants see their own folder + the shared `root/`).
- Config in `.env.local`:
  - `GTSDB_ADMIN_TOKEN` — the root token of the shared server (required to provision tenants)
  - `GTSDB_BASE_URL` — internal address the platform proxies to (default `http://localhost:5556`)
  - `GTSDB_PUBLIC_HTTP_URL` / `GTSDB_PUBLIC_TCP_URL` — public endpoints clients use
- Sandbox simulation is only a fallback when the shared server is unreachable.

## 🔥 Firebase setup

The project uses **Firebase Authentication** with **Email/Password** and
**Google** sign-in providers.

1. Go to the [Firebase Console](https://console.firebase.google.com) and open
   your project (project number **628700320308**).
2. **Authentication → Sign-in method**: enable *Email/Password* and *Google*.
3. **Project settings → General → Your apps**: create/register a **Web app** and
   copy its SDK configuration.
4. Fill `.env.local`:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

> If these are left empty, the app automatically falls back to a local
> **demo mode** so you can try everything without a Firebase project.

### How auth works

- **Client**: the Firebase JS SDK handles Email/Google sign-in.
- **Server**: API routes verify the Firebase ID token against the Identity
  Toolkit (`accounts:lookup`) using the public web API key — no service
  account needed.
- **Demo mode**: a local `demo.<uid>` token is accepted when Firebase is not
  configured, so the platform is fully explorable offline.

## 🏗 Architecture

```mermaid
graph TD
    subgraph Browser
        A[Landing / Docs] --> B[Auth pages]
        C[Dashboard Shell] --> D[Instances]
        D --> E[Data Explorer]
        D --> F[Console / Keys / Settings]
        B --> G[Firebase Auth]
    end

    subgraph Next.js API (platform backend)
        H[/api/auth/verify] --> I[verifyToken]
        J[/api/instances] --> K[File store]
        L[/api/instances/:id/proxy] --> M{GTSDB or Simulate}
        I --> J
    end

    M -- live --> N[GTSDB server<br/>HTTP :5556 / TCP :5555]
    M -- fallback --> O[Built-in simulator]
    K --> P[data/platform.json]
```

- **Control plane**: Next.js App Router with a small, dependency-free file store
  (`lib/store.ts`) that keeps users and instances. Swap it for Prisma/Supabase
  for serverless deployments.
- **Data access**: all GTSDB operations flow through
  `/api/instances/[id]/proxy`, which forwards to the live server or falls back
  to the built-in simulator (`lib/simulate.ts`).
- **Auth**: `lib/auth-context.tsx` (client) + `lib/server-auth.ts` (server).

## 💳 Freemium model

| | Free | Pro | Team |
|---|---|---|---|
| Price | $0 | $29/mo | $99/mo |
| Instances | 1 | 5 | 20 |
| Series / instance | 10 | 500 | 5,000 |
| Points / month | 1M | 50M | 500M |
| Retention | 7 days | 90 days | 12 months |

Plan switching is wired end-to-end (quota gating, usage meters). Charges are
**simulated** — plug in Stripe in `app/api/me/route.ts` for real billing.

## 🗂 Project structure

```
app/
  page.tsx                  Landing page
  pricing/ login/ signup/   Marketing & auth pages
  docs/                     Quickstart + API reference
  dashboard/                Overview, instances, billing, settings
  api/                      Platform backend routes
components/
  ui/                       shadcn/ui components
  layout/                   Marketing header/footer, dashboard shell
  landing/                  Landing page sections
  dashboard/                Cards, dialogs, stat widgets
  instance/                 Explorer, console, keys, settings
lib/
  auth-context.tsx          Firebase + demo auth provider
  server-auth.ts            Server-side token verification
  store.ts                  File-backed data store
  simulate.ts               GTSDB simulator
  gtsdb.ts / gtsdb-server.ts  GTSDB wire protocol + server client
  plans.ts                  Freemium plan definitions
hooks/                      use-instances, use-instance
```

## 🧪 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Lint |

## 📚 Related repos

- [GTSDB](https://github.com/abbychau/gtsdb) — the database engine
- [GTSDB Homepage](https://github.com/abbychau/gtsdb-homepage) — marketing site
- [GTSDB Admin](https://github.com/abbychau/gtsdb-admin) — admin tool
- [GTSDB Drivers](https://github.com/abbychau/gtsdb-drivers) — official drivers
- [GTSDB Benchmark](https://github.com/abbychau/gtsdb-benchmark) — benchmarks
