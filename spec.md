---
title: Finance Manager Technical Specification
version: 1.0
date_created: 2026-03-25
tags: [architecture, backend, frontend, database, infrastructure]
---

# Introduction

Finance Manager is a full-stack application designed for personal financial control. It allows users to manage categories, payment methods (accounts), transactions (single, fixed, or recurring), and investments.

# 1. Architecture Overview

The project follows a classic three-tier architecture, containerized with Docker:

- **Frontend**: Angular application served by Nginx.
- **Backend**: Node.js REST API using Express.
- **Database**: PostgreSQL for persistent storage.
- **Orchestration**: Docker Compose manages all services and their interconnections.

# 2. Technology Stack

## Frontend
- **Framework**: Angular (v17+)
- **Styling**: SCSS, Bootstrap 5, Animate.css
- **Icons**: Custom SVG icons served by the backend and local assets.
- **Communication**: REST API calls via Angular's HttpClient.

## Backend
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database Driver**: `pg` (node-postgres)
- **Middleware**: `cors`, `dotenv`, `multer` (for file handling).
- **Testing**: Jest, Supertest.

## Database
- **Engine**: PostgreSQL 16
- **Schema Management**: SQL-based initialization (`init.sql`).

# 3. Database Schema

The database uses several custom ENUM types and related tables to maintain data integrity.

## Enums
- `direcao_transacao`: `gasto`, `receita`
- `tipo_conta`: `carteira`, `credito`, `investimento`
- `tipo_transacao`: `avulsa`, `fixa`, `parcelada`

## Tables
| Table | Description |
|-------|-------------|
| `configuracoes` | Global system settings (e.g., `dia_inicio_periodo`). |
| `categorias` | Transaction categories with icons and direction. |
| `contas` | Payment methods or financial accounts (wallet, credit, etc.). |
| `recorrencias` | Templates for recurring transactions (fixed or installments). |
| `transacoes` | Individual financial records linked to categories, accounts, and recurrences. |
| `investimentos` | Asset tracking records. |

# 4. API Endpoints

The backend exposes the following base routes:

- `/categorias`: CRUD for transaction categories.
- `/metodos-pagamento`: CRUD for accounts/payment methods (linked to `contas` table).
- `/transacoes`: Management of individual and recurring transactions.
- `/configuracoes`: System-wide settings.
- `/investimentos`: Investment record management.
- `/saldo-acumulado`: Aggregated financial data and balances.

# 5. Infrastructure & Deployment

## Docker Services
- **`db`**: Runs `postgres:16-alpine`. Uses a volume for data persistence and `init.sql` for setup.
- **`backend`**: Node.js environment. Depends on the database.
- **`frontend`**: Built Angular app served via Nginx (configured in `nginx.conf`).

## Environment Variables
- `DATABASE_URL`: Connection string for PostgreSQL.
- `PORT`: Port on which the API listens (default 3000).

# 6. File Structure

```text
finance-manager/
├── back-end/
│   ├── src/
│   │   ├── db/          # Database connection and init scripts
│   │   ├── routes/      # Express route definitions
│   │   └── app.js       # App configuration
│   ├── server.js        # Entry point
│   └── Dockerfile
├── src/                 # Angular source code
│   ├── app/             # Components, Services, Models
│   └── styles.scss      # Global styles
├── docker-compose.yml   # Orchestration
└── nginx.conf           # Frontend server configuration
```
