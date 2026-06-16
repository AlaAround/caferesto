# TableOrder

Web-based digital ordering platform for restaurants. Customers scan a QR code, browse the menu on their phone, and place orders that appear instantly on the staff dashboard — no app download required.

Built with a four-layer anti-spoofing engine to ensure every order genuinely comes from a customer physically present at the venue.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite (PWA), Tailwind CSS, Recharts |
| Backend | Node.js + Fastify |
| Real-time | Socket.io |
| Database | PostgreSQL |
| Cache | Redis (token blacklist, session metadata) |
| Auth tokens | JWT (RS256 via jose) |

## Quick Start

### Prerequisites

- Node.js 20+
- Docker (for PostgreSQL + Redis)

### Setup

```bash
# Install dependencies
npm install

# Start PostgreSQL and Redis
npm run db:up

# Generate JWT signing keys
npm run generate-keys -w @tableorder/api

# Copy keys into .env (printed by generate-keys command)
cp .env.example .env
# Edit .env and paste JWT_PRIVATE_KEY and JWT_PUBLIC_KEY

# Run migrations and seed demo data
npm run db:migrate
npm run db:seed

# Start dev servers (API on :3001, Web on :5173)
npm run dev
```

### Demo URLs

| Role | URL |
|------|-----|
| Customer (Table 7) | http://localhost:5173/venue/restoran-el-bhar/table/7 |
| Staff Dashboard | http://localhost:5173/staff/restoran-el-bhar |
| Staff login | manager@elbhar.tn / demo1234 |

## Architecture

### Anti-Spoofing Security (4 Gates)

1. **GPS Permission** — Browser Geolocation API required; denial blocks the session
2. **Signed Token** — Short-lived (5 min), single-use JWT with table ID + GPS coordinates
3. **Proximity + Time** — Server validates distance from venue (< 100m) and token age
4. **Pattern Monitor** — Background worker flags anomalous scan/order patterns

### Project Structure

```
apps/
  api/          Fastify backend (routes, services, security)
  web/          React PWA (customer + staff UI)
packages/
  shared/       Shared types and utilities
database/
  schema.sql    PostgreSQL schema
  seed.sql      Demo venue + menu data
```

## Core Flow

```
QR Scan → GPS Capture → Token Issuance → Menu Browse → Cart → Order Submit
                                                              ↓
                                                    Staff KDS (real-time)
                                                              ↓
                                                    Customer Status (WebSocket)
```

## Environment Variables

See `.env.example` for all configuration options.

## License

Private — all rights reserved.
