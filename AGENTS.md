# AGENTS.md — OpenSCP

## Project

OpenSCP is an Electron desktop app: a modular WinSCP replacement with a dual-pane file manager (local | remote), connection manager, external editor/terminal integration, and pluggable protocol support.

Package manager: **pnpm** (pnpm-lock.yaml present).

## Reference

WinSCP source code and translations are at `https://github.com/winscp/winscp/tree/master`:
- Source code: `/sources`
- Translations: `/translations`

Refer to these for protocol behavior, UI patterns, and i18n conventions.

## Commands

```bash
pnpm dev              # Start Electron in dev mode (electron-vite dev)
pnpm build            # Production build (electron-vite build)
pnpm typecheck        # Type-check all packages (tsc --noEmit for node + web configs)
pnpm lint             # run linter
pnpm lint:fix         # run linter with autofix
pnpm test             # Run all vitest unit tests
pnpm test:watch       # Vitest in watch mode
pnpm test:coverage    # Vitest with coverage (v8 provider)
pnpm test:e2e         # Playwright integration tests
pnpm test:e2e:ui      # Playwright interactive UI mode
```

## Architecture

```
src/
  main/          Electron main process (window, IPC handlers, database)
  preload/       contextBridge API exposure to renderer
  renderer/      React UI (ConnectionManager → FileBrowser)
  shared/        Types, IPC channel constants shared between processes
  i18n/          Translation files (locale.json + index.ts)
```

- **Two tsconfigs**: `tsconfig.node.json` (main + preload + shared) and `tsconfig.web.json` (renderer + shared). The root `tsconfig.json` references both.
- **Build**: `electron-vite` with three entry configs: `main`, `preload`, `renderer`.
- **Database**: SQLite via `sql.js` + `drizzle-orm`. Schema at `src/main/database/schema.ts`, migrations at `src/main/database/migrations/`. Drizzle config at `drizzle.config.ts`.
- **IPC**: handlers registered in `src/main/ipc/`, channel names in `src/shared/ipc-channels.ts` using `connection:<action>` and `file:<action>` patterns.
- **Renderer API mock layer**: Electron context isolation is on — renderer accesses backend via `window.api` (typed `ElectronAPI`), exposed through preload `contextBridge`.
- **Default view**: app opens to Connection Manager UI. User selects/creates a connection before the FileBrowser view appears.
- **State**: Zustand for global state (`src/renderer/store/`). Hooks in `src/renderer/hooks/`.

## i18n

- All user-facing strings via `t('key')` from `src/i18n/index.ts`. Never hardcode strings.
- Translation files: `src/i18n/<locale>.json` with dot-notation flat keys (`"connection.new": "New Connection"`).
- Adding a locale = adding one JSON file; no code changes.

## Testing

### Unit tests (vitest)

- **Every utility, feature, component, hook, or other code module must have unit tests.**
- Tests are co-located with source files: `*.test.ts` or `*.test.tsx` in the same directory.
- vitest config: `globals: true`, `environment: "jsdom"`, setup file at `src/renderer/test/setup.ts`.
- Path aliases: `@renderer` → `src/renderer`, `@shared` → `src/shared`, `@i18n` → `src/i18n`.
- The setup file mocks `window.api` using `vi.stubGlobal("api", mockApi)`. Use `createMockApi()` (exported from setup) to build mock API objects. It provides default mock implementations for `connections.*` and `filesystem.*` IPC methods.
- Use `@testing-library/react` + `@testing-library/user-event` for component tests.

### E2E tests (Playwright)

- Located in `tests/integration/`.
- Uses a standalone Vite dev server (`vite.renderer.test.config.ts`, port 5174) with in-page mock API via `page.addInitScript()`.
- Run with `pnpm test:e2e`.

## Code Style

- **Indentation**: tabs (set in `.editorconfig`).
- **TypeScript 6.0.3**, strict mode enabled in root `tsconfig.json`.
- **Component pattern**: each component folder (e.g. `ConnectionManager/`) contains the component `.tsx`, its CSS module `.module.css`, and co-located test `.test.tsx`.
- **CSS Modules**: use `*.module.css` for component styles (Tailwind is also available).
- **IPC channel constants**: always use `IPC.*` from `src/shared/ipc-channels.ts`, never hardcode channel strings.
- **Logging**: use `@sym:Logger` for logs and ensure any error is recorded through the shared logger.

## Gotchas

- **Context isolation** is on — renderer code never imports Node/native modules. All OS/db access goes through `contextBridge` + `ipcRenderer.invoke`.
- **Settings persist in `app.getPath('userData')`**, not the repo or app bundle.
- **Database uses sql.js** (WASM-based SQLite), not better-sqlite3 (native). The adapter is in `src/main/database/sqljs-adapter.ts`.
- **Tailwind CSS v4** with `@tailwindcss/vite` plugin.
