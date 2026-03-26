# AI Agent Guidelines - Finance Manager

This document defines the rules and patterns that AI agents must follow when contributing to the Finance Manager repository.

## 1. Context & Architecture
Refer to [spec.md](./spec.md) for the full technical stack and database schema.

- **Backend**: Node.js (ESM) + Express + PostgreSQL.
- **Frontend**: Angular (Standalone Components) + SCSS + Bootstrap.

## 2. Coding Standards

### Frontend (Angular)
- **Standalone Components**: Do not use `NgModule`. All new components must have `standalone: true`.
- **Project Structure**:
    - `src/app/core/`: Global models (`.model.ts`) and root-provided services (`.service.ts`).
    - `src/app/features/`: Functional modules (route-based). Each feature should be self-contained.
- **LIFT Principle**: Keep code readable, easy to locate, flat (avoid deep nesting), and try to stay DRY.

### Backend (Node.js)
- **Modular ESM**: Use `import/export` syntax exclusively.
- **Controllers/Routes**: Keep business logic in services or dedicated handlers, mapped via routes in `back-end/src/routes`.

### Naming Conventions
- **Domain Elements (Portuguese)**: Use Portuguese for business nouns (e.g., `Transacao`, `Conta`, `Categoria`, `Investimento`).
- **Technical Logic (English)**: Use English for method names, variable names (non-domain), and file structure (e.g., `getTransactions()`, `save()`, `core/`, `services/`).

## 3. Database & Persistence
- **PostgreSQL**: Always respect the Enums defined in `back-end/src/db/init.sql`:
    - `direcao_transacao` (`gasto`, `receita`)
    - `tipo_conta` (`carteira`, `credito`, `investimento`)
    - `tipo_transacao` (`avulsa`, `fixa`, `parcelada`)
- **Data Integrity**: Ensure foreign key relationships are maintained and use appropriate numeric types (`DECIMAL(15,2)`) for money.

## 4. Development Workflow

### Git & Commits
- Use **Conventional Commits**.
- Structure: `type(scope): description`.
- Types: `feat`, `fix`, `docs`, `refactor`, `style`, `test`, `chore`.

### Verification (Mandatory)
- **Always** update `task.md` before starting and after finishing sub-tasks.
- **Test in Browser**: Before notifying the user, use the `browser_subagent` to verify UI changes and ensure no regressions.
- **Background Processes**: Run the backend and frontend in the background to validate real-time interactions.

## 5. Documentation
- Keep `spec.md` updated if the architecture or schema changes.
- Use `walkthrough.md` for major implementation summaries with visual proof.
