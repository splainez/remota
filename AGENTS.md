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
pnpm run dev              # Start Electron in dev mode (electron-vite dev)
pnpm run build            # Production build (electron-vite build)
pnpm run typecheck        # Type-check all packages (tsc --noEmit for node + web configs)
pnpm run lint             # run linter
pnpm run lint:fix         # run linter with autofix
pnpm run test             # Run all vitest unit tests
pnpm run test:e2e         # Playwright integration tests
pnpm run fmt              # run formatter
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

## Workflow

Before considering any task complete, the following checks **must** pass:

```bash
pnpm run typecheck   # Verify all types are correct
pnpm run lint        # Verify no linting errors
pnpm run test:all    # Run all tests (unit + e2e + integration)
pnpm run build       # Production build (electron-vite build)
pnpm run fmt         # run formatter after each task
pnpm run check       # run all checks to verify no errors
```

If any of these commands fail, fix the issues before marking the task as done.

## Code Style

- **Indentation**: tabs (set in `.editorconfig`).
- **TypeScript 6.0.3**, strict mode enabled in root `tsconfig.json`.
- **Component pattern**: each component folder (e.g. `ConnectionManager/`) contains the component `.tsx`, its CSS module `.module.css`, and co-located test `.test.tsx`.
- **CSS Modules**: use `*.module.css` for component styles (Tailwind is also available).
- **IPC channel constants**: always use `IPC.*` from `src/shared/ipc-channels.ts`, never hardcode channel strings.
- **Logging**: use `@sym:Logger` for logs and ensure any error is recorded through the shared logger.

## Design System

The application uses a comprehensive design system with **Light** and **Dark** modes. When adding new views or modifying existing ones, always reference the corresponding design guidelines:

- **Light Mode:** [desing/light/DESIGN.md](desing/light/DESIGN.md)
- **Dark Mode:** [desing/dark/DESIGN.md](desing/dark/DESIGN.md)

### Style Guidelines Summary

#### Colors

- **Primary:** `#5865f2` (Blurple) - used for brand recognition, primary actions, and active states
- **Light Mode Surfaces:** `#ffffff` (content), `#f8f9fa` (background), `#f3f4f5` (containers)
- **Dark Mode Surfaces:** `#0d141b` (background), `#151c23` (container low), `#192027` (container)
- **Text:** High contrast (`#191c1d` light / `#dce3ed` dark) for WCAG AA/AAA compliance
- **Borders & Dividers:** `#e1e3e4` (light) / `#454655` (dark) for subtle separation

#### Typography (Inter font exclusively)

- **headline-lg:** 32px / 700 weight (24px on dark, 600 weight)
- **headline-md:** 24px / 600 weight (18px on dark)
- **body-lg:** 16px / 400 weight (15px on dark)
- **body-md:** 14px / 400 weight
- **label-md:** 12px / 600 weight with 0.01em letter-spacing
- **mono-sm:** JetBrains Mono, 12px (dark mode only, for logs/terminals)

#### Spacing & Layout

- **Base unit:** 8px grid rhythm
- **Gutter:** 16px
- **Margin (desktop):** 24px / 16px (mobile)
- **Sidebar width:** 240px (dark mode)
- **Header height:** 48px

#### Border Radius

- **sm:** 0.25rem (4px)
- **DEFAULT:** 0.5rem (8px)
- **md:** 0.75rem (12px)
- **lg:** 1rem (16px)
- **xl:** 1.5rem (24px)

#### Elevation & Depth

- **Light mode:** Tonal layers with 1px subtle borders; minimal shadows
- **Dark mode:** Tonal layering through charcoal shifts; subtle outlines; glassmorphism overlays with `backdrop-filter: blur(12px)`
- **Hover states:** Light tint overlay (10% opacity) on light mode; subtle background highlight on dark mode

#### Components Standards

- **Buttons:** Primary (Blurple bg + white text), Secondary (light gray bg + dark text), 8px radius
- **Inputs:** White/dark bg, 1px border, focus state with 2px primary glow, 8px radius
- **Cards:** White/dark bg, 1px border, no shadow for static cards
- **File lists:** 32-40px row height, monospace font for metadata
- **Transfer panel:** Bottom-anchored, 4px progress bar, collapsible

## React Best Practices

This project follows Vercel's React composition and performance guidelines. Load the corresponding skill before refactoring React components or implementing new UI patterns.

### Composition Patterns

Use **[`vercel-composition-patterns`](.agents/skills/composition-patterns/SKILL.md)** when refactoring components with many boolean props, building reusable component APIs, or designing compound components. Key principles:

- **Avoid boolean prop proliferation** — use compound components with explicit variants instead of `isEditing`, `isThread`, etc.
- **Decouple state from UI** via provider components exposing `{ state, actions, meta }` context interfaces; same UI works with different state implementations (useState, Zustand, server sync).
- **Lift state into providers** so siblings outside the visual tree can access shared state and actions without prop drilling.
- **Prefer children over render props** for composition; use render props only when the parent provides data.
- **React 19**: `ref` is a regular prop (no `forwardRef`), use `use()` instead of `useContext()`.

### Performance Optimization

Use **[`vercel-react-best-practices`](.agents/skills/react-best-practices/SKILL.md)** when writing new React components, reviewing for performance, or optimizing bundle size. Key priorities by impact:

- **CRITICAL — Eliminate waterfalls**: use `Promise.all()` for independent async operations, defer `await` into branches that need it, start promises early and await late.
- **CRITICAL — Bundle size**: avoid barrel file imports (import directly), use `React.lazy` / dynamic imports for heavy components, defer non-critical third-party libs.
- **HIGH — Server-side**: use `React.cache()` for per-request deduplication, minimize data passed through RSC boundaries, hoist static I/O to module level.
- **MEDIUM — Re-renders**: derive state during render instead of syncing via effects, use functional `setState` for stable callbacks, extract expensive work into `memo`-ized components, use `useRef` for transient values, use `startTransition` for non-urgent updates.
- **MEDIUM — Rendering**: `content-visibility: auto` for long lists, hoist static JSX outside components, use ternary (`? :`) instead of `&&` for conditional rendering.
- **LOW-MEDIUM — JS perf**: use `Set`/`Map` for O(1) lookups, build index maps for repeated searches, combine multiple `filter`/`map` into one loop, use `flatMap` to map+filter in one pass.

## Good Practices (Mandatory)

### 1. Casting with `as` → Use Zod for runtime validation

Never use `as` to force a type (type casting). When converting an unknown or generic type to a concrete one, create a Zod schema that validates the structure at runtime and use `parse` / `safeParse`. This way, if the source type changes, the schema will throw an error instead of failing silently in production.

#### ❌ DON'T — Casting with `as`

```typescript
const data: unknown = JSON.parse(rawJson);

// Danger: if data doesn't match expected shape, it fails silently at runtime
const user = data as { name: string; email: string };
console.log(user.email); // could be undefined without warning
```

#### ✅ DO — Zod schema + parse

```typescript
import { z } from "zod";

const UserSchema = z.object({
	name: z.string(),
	email: z.string().email(),
});

const parsed = UserSchema.safeParse(data);

if (!parsed.success) {
	console.error("Validation error:", parsed.error.flatten());
	return;
}

// parsed.data is safely typed as { name: string; email: string }
console.log(parsed.data.email);
```

If the schema and TypeScript type must stay in sync, also export the type with `z.infer`:

```typescript
export type User = z.infer<typeof UserSchema>;
```

#### ✅ DO — Known type from a library, create equivalent schema

When the type already exists (imported from a library or from `shared/`), don't use `as` to convert. Create a Zod schema that mirrors the type's structure and validate at runtime:

```typescript
import type { ConnectionConfig } from "../shared/types";
import { z } from "zod";

// Schema that replicates the known type's structure
const ConnectionConfigSchema: z.ZodType<ConnectionConfig> = z.object({
	host: z.string(),
	port: z.number(),
	username: z.string(),
	protocol: z.enum(["sftp", "scp", "ftp"]),
});

function processConfig(raw: unknown) {
	const parsed = ConnectionConfigSchema.safeParse(raw);

	if (!parsed.success) {
		throw new Error(`Invalid config: ${parsed.error.flatten()}`);
	}

	// parsed.data is safely typed as ConnectionConfig
	const config: ConnectionConfig = parsed.data;
	return config;
}
```

## Gotchas

- **Context isolation** is on — renderer code never imports Node/native modules. All OS/db access goes through `contextBridge` + `ipcRenderer.invoke`.
- **Settings persist in `app.getPath('userData')`**, not the repo or app bundle.
- **Database uses sql.js** (WASM-based SQLite), not better-sqlite3 (native). The adapter is in `src/main/database/sqljs-adapter.ts`.
- **Tailwind CSS v4** with `@tailwindcss/vite` plugin.
