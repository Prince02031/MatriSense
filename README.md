# MatriSense

Monorepo-style setup with:

- `backend/` — Node.js + Express API
- `frontend/` — Next.js + React app

## Backend

```bash
cd backend
npm install
npm run dev
```

Runs on http://localhost:5000 by default.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on http://localhost:3000 by default.

## Environment variables

- Copy `backend/.env.example` to `backend/.env`
- Copy `frontend/.env.local.example` to `frontend/.env.local`

## API endpoints

- `GET /health`
- `GET /api/message`

## Demo Credentials

You can log into the respective interfaces using the mock credentials baked into the Database Seed. 

- **Mother App:** `mother@demo.com` / `password`
- **Dashboard:** `worker@demo.com` / `password`
