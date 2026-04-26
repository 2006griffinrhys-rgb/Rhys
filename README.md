# Rhys App

A complete full-stack app project that is ready to run locally.

## What is included

- **Frontend:** React + Vite (`/client`)
- **Backend API:** Node.js + Express (`/server`)
- **Data storage:** local JSON file (`/server/data/tasks.json`)
- **Root workspace scripts:** run frontend and backend together

## Project structure

```text
.
├── client/
│   ├── src/
│   └── package.json
├── server/
│   ├── src/
│   │   ├── server.js
│   │   └── store.js
│   ├── data/
│   │   └── tasks.json
│   └── package.json
└── package.json
```

## Prerequisites

- Node.js 20+ recommended
- npm 10+ recommended

## Run locally

From the repository root:

```bash
npm install
npm run dev
```

This starts:

- API on `http://localhost:4000`
- Frontend on `http://localhost:5173`

The Vite dev server proxies `/api` requests to the backend.

## Useful scripts

At the repository root:

- `npm run dev` - Run backend + frontend in development mode
- `npm run build` - Build frontend for production
- `npm run start` - Start backend in production mode
- `npm run lint` - Run frontend lint checks
