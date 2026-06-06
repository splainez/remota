# AGENTS.md — OpenSCP

## 1. Stack

Electron 42 + electron-vite 5 (main / preload / renderer). React 19.2 + TS 6.0.3 strict. Tailwind v4. shadcn/ui (`base-nova`, `neutral`, `lucide`). Zustand 5. ssh2 + @aws-sdk/client-s3. xterm + node-pty. Zod 4. @tanstack/react-form. pino. **pnpm.**

## 2. Commands

| Cmd                                          | What                                                         |
| -------------------------------------------- | ------------------------------------------------------------ |
| `pnpm dev` / `build` / `preview`             | dev / prod build / preview prod                              |
| `pnpm typecheck`                             | `tsc --noEmit` on both tsconfig projects                     |
| `pnpm lint` / `lint:fix`                     | ESLint                                                       |
| `pnpm fmt` / `fmt:check`                     | oxfmt (sortImports, printWidth 120)                          |
| `pnpm test` / `test:watch` / `test:coverage` | vitest unit                                                  |
| `pnpm test:integration`                      | vitest + testcontainers (Docker or `TEST_USE_EXTERNAL=true`) |
| `pnpm test:all`                              | unit + integration                                           |
| `pnpm test:e2e` / `test:e2e:ui`              | Playwright (chromium, port 5174)                             |
| `pnpm check`                                 | fmt+lint+typecheck+test+build. **Pre-PR gate.**              |

## 3. Architecture

3 procs, **context isolation ON**. Renderer → only via `window.api`. Tree: `src/{main,preload,renderer,shared,i18n}/`. Path aliases: `@main/*`, `@renderer/*`, `@shared/*`, `@i18n/*`. 5 Zustand stores in `src/renderer/store/`. 20 hooks in `src/renderer/hooks/`. Both co-locate `*.test.{ts,tsx}`.

## 4. window.api (preload + contextBridge)

Renderer NEVER imports Node. 7 NS: `connections`, `filesystem` (local/remote/temp), `terminal`, `settings`, `transferPanel`, `app`, `platform`. All async → Promises. `on*` return unsub fn. Mirror type in `src/preload/index.d.ts` (`ElectronAPI`).

## 5. Protocols

SFTP/SCP: `ssh2` `Client` (`readyTimeout: 10_000ms`, `keepaliveInterval: 30_000ms`). Auth: `password` | `key` (file → `privateKey`) | `agent` (`SSH_AUTH_SOCK`). S3: `@aws-sdk/client-s3` w/ `forcePathStyle: true`, bucket validated via `HeadBucketCommand`, `ListObjectsV2Command` w/ `Delimiter: "/"` for folder emulation + `ContinuationToken` for pagination. `scp`/`sftp` share code path. Discriminated union via `z.discriminatedUnion("protocol", …)`.

## 6. Persistence

JSON file at `app.getPath("userData")/app-config.json` (NOT repo, NOT bundle). **No SQL / no Drizzle / no sql.js** (earlier drafts mentioned these by mistake). `AppStore` (src/main/app-store.ts): debounced 500ms write, `flush()` on `will-quit`, `ConfigValidationError` surfaced via `app:getConfigError` + `config-error` push ch → `ConfigError` modal. **Credentials plaintext** — treat file as sensitive.

## 7. Terminal

`TerminalAppId` in `src/shared/app-config-schema.ts` (8 values: windows-terminal, kitty, ghostty, alacritty, iterm2, terminal-app, gnome-terminal, konsole). Detection in `terminal-detector.ts`: CLI via `where.exe`/`which` w/ 2s timeout; macOS `.app` via `ABSOLUTE_PATHS` + `existsSync`. Local: `node-pty` w/ `$SHELL` (win32: pwsh → powershell → cmd). Remote: ssh2 `shell` ch. Session id: `${type}-${String(connectionId)}`. `useSettingsStore.load` does recovery: if configured `externalTerminal` not installed → reset + sonner warning toast.

**macOS exception:** `iterm2` / `terminal-app` launch "sshless" (user runs `ssh` manually) → renderer info toast. Other macOS terminals use normal `ssh args` path.

## 8. i18n

`en.json` = source of truth for `TranslationKey` (derived union). `es.json` must mirror. Validation error messages = translation keys, NEVER localized strings. New locale = add `<locale>.json` + update `i18n.ts` (`TranslationsAll` + `LocaleAvailable`) + add option in `SettingsView`.

## 9. UI

- `ThemeProvider` cycles `light`/`dark`/`system` via global `d` shortcut. Persists via `useSettingsStore.setTheme`. `sonner`: `richColors`, `position="bottom-right"`.
- **Design specs:** `desing/light/DESIGN.md` + `desing/dark/DESIGN.md` (dir intentionally `desing`). **Always ref both** before touching views.
- **Tailwind v4** tokens in `src/renderer/global.css` via `@theme inline`. **Semantic class names** (`bg-surface`, `text-on-surface`, `border-outline-variant`). **No hardcoded hex.**
- **Icons:** `<Icon name="folder" size={16} />` from `src/renderer/components/icons/Icon.tsx` (wraps `react-icons/vsc`). Never direct `react-icons/vsc` imports. `iconMap` in that file = single place to add/alias.
- **shadcn/ui** in `src/renderer/components/ui/`. Config in `components.json` (`base-nova`, `neutral`, `lucide`). **No barrel re-exports** — import directly from the shadcn module.
- **React 19:** `ref` = regular prop (no `forwardRef`). Prefer `use()` over `useContext()`.

## 10. Forms

`@tanstack/react-form` w/ Zod. `ConnectionForm` flat `defaultValues` for both proto branches; switches visible fields via `form.Subscribe selector={(s) => s.values.protocol}`. `DEFAULT_PORT = { sftp: 22, scp: 22, s3: 443 }`. Per-field blur validators for inline feedback; full schema validates on submit.

## 11. Validation

Zod 4 everywhere. `AppConfigSchema` (`.strict()`) w/ defaults. IPC handlers re-parse payloads and throw `Error("Invalid …: …")`. `classifyError(unknown)` in `src/shared/sftp-error.ts` → typed `SftpErrorCode` + `getErrorI18nKey(code)` for `t(...)`. **Never raw `Error.message` to user.**

## 12. Testing

- **Unit (vitest):** `environment: "jsdom"` w/ `environmentMatchGlobs: [["src/main/**", "node"]]` (main-proc tests use node env). Setup at `src/renderer/test/setup.ts`: `createMockApi(overrides?)` stub, `ResizeObserver` mock, legacy `matchMedia` w/ `addListener` (xterm needs this — don't remove). Co-locate `*.test.{ts,tsx}`.
- **E2E (Playwright):** `tests/integration/*.spec.ts` (separate from vitest `*.test.ts`). Vite dev server on port 5174. In-page mock API via `page.addInitScript(...)`. Single `chromium` project.
- **Integration (vitest + testcontainers):** `vitest.integration.config.ts`, `environment: "node"`, 120s timeouts, `globalSetup: "./tests/integration/vitest-global-setup.ts"`. Wrappers in `tests/integration/containers/`. `.env.example` for `TEST_USE_EXTERNAL=true` (real servers) vs Docker. `docker-compose.yml` brings up ssh (10022), sftp (2222), ftp (21), s3 (9000/9001) + bucket init.

## 13. Workflow

```bash
pnpm check   # = fmt:check + lint --quiet + typecheck + test --silent + build
```

If fail → fix before marking done. **Never commit with failing pipeline.**

Beyond passing checks: every change must leave codebase **more maintainable** than found. _Would I understand this in 6 months?_ If no → refactor. Integration + E2E not in `check` (need Docker/browsers). Run before PR if you touch IPC, main-proc, proto clients, cross-process types, or Playwright-covered flows.

## 14. Code style

- Tabs. Print width 120. LF.
- TS 6.0.3 strict + `noUnusedLocals` + `noUnusedParameters` + `noFallthroughCasesInSwitch` + `verbatimModuleSyntax` + `allowImportingTsExtensions` + `noUncheckedSideEffectImports`.
- ESLint: `typescript-eslint` `strictTypeChecked` + `stylisticTypeChecked`, `react-hooks`, `react-refresh`, `import-alias` (enforces alias usage). `consistent-type-exports`/`consistent-type-imports` = error. `react-hooks/set-state-in-effect` = warn.
- Component pattern: folder w/ `.tsx` + `*.module.css` + `*.test.tsx` co-located.
- **Maintainability = primary non-functional goal.** SOLID + KISS as default lens.

## 15. Good practices (mandatory)

1. **`as` → Zod.** Never `as` to force type. Unknown → Zod `parse`/`safeParse`. Source type change → schema throws, not silent fail. Schema + TS type in sync → `z.infer`. Known lib type → mirror w/ `z.ZodType<T>`.
2. **Classify errors.** Caught → `classifyError(err)` → `t(getErrorI18nKey(code))`. **Never raw `Error.message` to user.**
3. **Async lifecycle.** Long-lived effects: `cancelled` flag or request-id guard before applying async results to state. See `useFileList` + `FileBrowser.tsx`.
4. **Persist via stores.** **Never** `window.api.settings.set` / `transferPanel.set` from components. Go through Zustand store.
5. **SOLID + KISS — maintainability first.**
   - **KISS:** simplest impl. One thing per fn. No clever one-liners. No abstraction until 2 concrete use cases.
   - **S** (SRP): each module/hook/store/component = 1 reason to change. `SftpConnectionManager` = ssh2; `useRemoteConnection` = lifecycle; `app-store.ts` = config JSON.
   - **O** (OCP): extend by adding. New proto = new mgr + branch in `remote-filesystem.ts`. New terminal = new `TerminalAppId` + case in `getLocalCommand`/`getSshCommand`. New locale = new JSON + 1 line in `i18n.ts`.
   - **L** (LSP): `IPtySession` / `RemoteShellSession` honour same write/resize/kill contract. `ElectronAPI` mocks MUST follow same shape or tests lie.
   - **I** (ISP): components get only callbacks they use. `useContextMenu<T>()` generic. Zod schemas split: full / IPC partials / form.
   - **D** (DIP): renderer talks `window.api.*`, never `ipcRenderer` direct. Stores depend on `window.api`, not `ipcRenderer`. Tests inject `createMockApi(overrides?)`, not patch `ipcRenderer`.

   **Red flags — stop + refactor:**
   - `flag: boolean` switching 2 unrelated behaviours → 2 fns.
   - Component importing `src/main/*` → wrong boundary.
   - Store action calling multiple `window.api.*` NS to "save everything" → split per-resource.
   - `try/catch` swallowing w/o `logger.error(...)` + `classifyError(...)` → silent fail.
   - Test mocking 6+ internals to verify 2-line behaviour → module too big.
   - 8-case switch + "just one more `else if`" → registry/map.

## 16. Gotchas

- **Context isolation ON.** Renderer NEVER imports Node/native. All OS/db/network → `window.api`.
- **Settings path:** Win `%APPDATA%\openscp`, macOS `~/Library/Application Support/openscp`, Linux `~/.config/openscp`.
- **IPC chs = `IPC.*` only** from `src/shared/ipc-channels.ts`. Never hardcode `"connection:list"` etc.
- **No comments in code.** Project policy. If unclear → rename or split.
- **No `as` casts.** Validate w/ Zod.
- **No barrel re-exports from `components/ui`.** Import directly from shadcn module.
- **Logger = `LoggerFactory.init({ name: "…" })`** from `@shared/lib/logger` (pino, pretty-print in dev). Not `@sym:Logger`. Always structured ctx: `logger.error("action failed", { id, error })`.
- **jsdom + xterm** need legacy `matchMedia` w/ `addListener`/`removeListener`. Setup file stubs it — don't remove.
- **Main proc tests** use `node` env (via `environmentMatchGlobs`); renderer uses `jsdom`. **No Node imports in renderer tests.**
- **`process.platform`** snapshotted in preload (`window.api.platform` = string, not live). Use `usePlatformStore`, not re-read.
- **`ELECTRON_RENDERER_URL`** = dev mode flag in `src/main/index.ts`. Any code branching on it = dev-only path.
- **Credentials plaintext** in `app-config.json` (no OS keychain yet) → treat file as sensitive, warn users before sharing logs.
- **`pnpm check` is the pre-PR gate.** CI runs `fmt:check` + `lint --quiet` + `typecheck` + `test --silent` + `build`. Integration + E2E skipped (Docker/browsers needed).
