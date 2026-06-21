> **Disclaimer**
>
> This project was developed almost entirely by an AI coding agent with minimal human supervision. The author is a motivated user who needed a reliable file manager for Linux that could handle secure remote transfers — and after trying every existing option without finding one that fully met their needs, they decided to build one from scratch using AI. **Remota** is the result: a dual-pane file manager in active development, powered by multiple AI models orchestrated through [opencode](https://opencode.ai). Expect bugs, incomplete features, and breaking changes — this is a very early-stage project.

---

# Remota

A dual-pane file manager for securely transferring files between your local machine and remote servers. Built on encrypted protocols — **SFTP**, **SCP**, and **S3** — so your data never travels in plain text.

Remota gives you a split-view interface where one pane shows your local filesystem and the other shows a remote server. Browse, upload, download, rename, delete, create files and folders, all from a single window. When you need deeper access, open an integrated terminal directly into the remote session.

## Features

- **Dual-pane browser** — local and remote filesystems side by side, with resizable split and persistent pane ratios per connection
- **SFTP / SCP / S3 support** — connect to SSH servers or S3-compatible storage (AWS, MinIO, etc.) with full CRUD operations
- **Secure authentication** — password, private key file, or SSH agent forwarding for SSH; access keys for S3
- **File transfers** — parallel uploads and downloads with configurable concurrency (1–20), real-time progress, speed display, and per-item cancellation
- **Conflict resolution** — overwrite/skip dialogs when destination files already exist, with batch options
- **Remote editing** — download a remote file, open it in your local editor, and auto-sync changes back on save
- **Integrated terminal** — embedded xterm.js shell in each pane (local via node-pty, remote via SSH)
- **External terminal support** — launch Windows Terminal, iTerm2, Kitty, Ghostty, Alacritty, GNOME Terminal, Konsole, or Terminal.app
- **Connection management** — create, edit, group, and organize server profiles; import/export from `~/.ssh/config`
- **Recent connections** — quick access to your last 5 servers; Windows Jump List integration from the taskbar
- **Active sessions sidebar** — see all connected servers at a glance with status indicators and one-click disconnect
- **Configurable UI** — dark/light/system theme, adjustable font size, column visibility toggles, file filtering with wildcards
- **i18n** — English and Spanish, with a translation-key-driven system that keeps error messages out of raw strings
- **Graceful error handling** — classified error codes (connection refused, auth failed, timeout, etc.) displayed through localized messages, never raw stack traces

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/)
- [Docker](https://docs.docker.com/get-docker/) (optional, for integration tests and cross-platform builds)

### Install

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

This starts the Electron app in development mode with hot reload.

### Build

```bash
# Production build
pnpm build

# Preview the production build
pnpm preview
```

### Package for Distribution

```bash
pnpm build:win      # Windows portable (.exe)
pnpm build:linux    # Linux AppImage
pnpm build:mac      # macOS DMG + ZIP (x64 + arm64)
```

Or build via Docker (no local toolchain needed):

```bash
pnpm build:docker:win
pnpm build:docker:linux
pnpm build:docker:all
```

## Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start in development mode |
| `pnpm build` | Production build |
| `pnpm preview` | Preview production build |
| `pnpm typecheck` | Run TypeScript type checking on all configs |
| `pnpm lint` / `pnpm lint:fix` | ESLint — check / auto-fix |
| `pnpm fmt` / `pnpm fmt:check` | oxfmt formatter — format / check |
| `pnpm test` | Run unit tests (vitest) |
| `pnpm test:watch` | Unit tests in watch mode |
| `pnpm test:coverage` | Unit tests with coverage |
| `pnpm test:integration` | Integration tests (vitest + Docker testcontainers) |
| `pnpm test:e2e` | End-to-end tests (Playwright, Chromium) |
| `pnpm check` | **Pre-PR gate**: fmt:check + lint + typecheck + test + test:integration + build |

## Architecture

Remota is a standard Electron application with three isolated processes:

```
┌─────────────────────────────────────────────────┐
│  Main Process  (Node.js — Node API, SSH, S3)    │
│  src/main/                                      │
├─────────────────────────────────────────────────┤
│  Preload  (contextBridge — the API surface)     │
│  src/preload/                                   │
├─────────────────────────────────────────────────┤
│  Renderer  (React — UI only, no Node access)    │
│  src/renderer/                                  │
└─────────────────────────────────────────────────┘
```

Context isolation is **on**. The renderer never imports Node modules directly — all OS-level operations (filesystem, SSH, S3, terminal) go through `window.api`, which is the bridge exposed by the preload script. This is enforced at build time.

- **Main process** handles SSH/SFTP connections (`ssh2`), S3 operations (`@aws-sdk/client-s3`), file transfers with parallel queue (`p-queue`), local terminal spawning (`node-pty`), file watching, and config persistence
- **Renderer** is a React 19 app with Zustand stores, TanStack Form, Tailwind CSS v4, and shadcn/ui components
- **Shared schemas** (Zod) validate all data crossing the IPC boundary — invalid payloads are rejected at runtime

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Electron 42 |
| Build | electron-vite 5 |
| Frontend | React 19 + TypeScript 6 (strict) |
| Styling | Tailwind CSS v4 |
| UI | shadcn/ui (base-nova, neutral) |
| Forms | @tanstack/react-form + Zod |
| State | Zustand 5 |
| SSH | ssh2 |
| S3 | @aws-sdk/client-s3 |
| Terminal | xterm.js + node-pty |
| Logging | pino |
| Package Manager | pnpm |

## Testing

| Type | Tool | Command |
|---|---|---|
| Unit | Vitest + jsdom | `pnpm test` |
| Integration | Vitest + testcontainers | `pnpm test:integration` |
| E2E | Playwright (Chromium) | `pnpm test:e2e` |

Integration tests spin up a real SSH server and an S3-compatible storage via Docker Compose. Set `TEST_USE_EXTERNAL=true` in a `.env` file to point at your own servers instead.

## Supported Platforms

| Platform | Format | Architecture |
|---|---|---|
| Windows | Portable (.exe) | x64 |
| macOS | DMG + ZIP | x64 + arm64 |
| Linux | AppImage | x64 |

## License

MIT
