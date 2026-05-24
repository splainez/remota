# AGENTS.md — OpenSCP

## Project

OpenSCP is an Electron desktop app: a modular WinSCP replacement with a dual-pane file manager (local | remote), connection manager, external editor/terminal integration, and pluggable protocol support.

## Reference

WinSCP source code and translations are at `https://github.com/winscp/winscp/tree/master`:
- Source code: `/sources`
- Translations: `/translations`

Refer to these for protocol behavior, UI patterns, and i18n conventions.

## Architecture

```
src/
  main/          Electron main process (window management, IPC handlers, protocol backends)
  renderer/      Electron renderer (UI)
  shared/        Types, constants, utilities shared between processes
  protocols/     Pluggable connection drivers (SFTP, SCP, S3, …)
  i18n/          Translation files (keyed by locale: en, es, …)
```

- **Electron process model**: filesystem and protocol operations live in `main/` and are exposed to `renderer/` via IPC. The renderer never imports native modules directly.
- **Protocols are plugins**: each protocol (SFTP, SCP, S3) implements a common `ConnectionDriver` interface defined in `shared/`. Adding a protocol means implementing that interface and registering it — no UI changes required.
- **Dual-pane layout**: left pane = local filesystem; right pane = active remote connection. Component naming: `LocalBrowser`, `RemoteBrowser`, `TransferQueue`.
- **Default view**: the app opens to the **Connection Manager**, not a file browser. The user must select or create a connection before the dual-pane view appears.

## Commands

> Replace `<pkg>` with one of `npm`, `yarn`, or `pnpm` depending on final tooling choice.

```bash
<pkg> dev              # Start Electron in dev mode (HMR)
<pkg> build            # Production build
<pkg> lint             # Lint all packages
<pkg> test             # Run all tests
<pkg> test -- <glob>   # Run a single test file or suite
<pkg> typecheck        # TypeScript type checking
```

## i18n

- All user-facing strings go through `t('key')` — never hardcoded in components.
- Translation files live in `src/i18n/<locale>.json` (flat JSON with dot-notation keys: `"connection.new": "New Connection"`).
- Adding a locale means adding one JSON file; no code changes.
- Initial locales: `en`, `es`.

## Editor & Terminal Integration

- Both are external processes configured via user settings (path + optional args).
- For remote files: download to temp → open in editor → watch for changes → re-upload on save.
- Terminal opens an OS shell in the directory of the active pane (local or a temp dir for remote).
- Defaults: the OS default shell (`cmd.exe` / `pwsh` on Windows, `$SHELL` otherwise).

## Code Style Conventions

- TypeScript strict mode for `shared/` and `protocols/`.
- Each protocol is its own subdirectory under `src/protocols/` with zero dependencies on other protocols.
- IPC channel names are namespaced: `protocol:<name>:<action>` and `file:<action>`.
- Prefer `pnpm` workspaces if the project grows beyond a single package.

## Non-Obvious Gotchas

- **Electron context isolation is on by default** — renderer code cannot use Node APIs. All backend work goes through `contextBridge` + `ipcRenderer.invoke`.
- **Protocol registration is dynamic**: protocols self-register in a global registry on import. Loading a protocol adds it to the connection manager UI automatically.
- **Settings are persisted in the OS user config directory** (`app.getPath('userData')`), not in the repo or app bundle.
