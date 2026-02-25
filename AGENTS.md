# AGENTS.md

This guide is for coding agents working in `E:\Code\MySCUT`.
It reflects the current repository state and local conventions.

## 0) Mandatory Source of Truth

- `PROJECT_BASIS.md` is a required, higher-priority local convention document.
- Agents must follow its architecture conventions, tech stack conventions, and coding style conventions.
- If this file and `PROJECT_BASIS.md` ever diverge, follow `PROJECT_BASIS.md` first and then update this file.
- Agents should frequently consult the official references listed in `PROJECT_BASIS.md` (especially `llms.txt` links) to improve implementation correctness before and during coding.

## 1) Current Project Snapshot

- Stack: Vite 5 + React 18 + TypeScript + Ant Design 5.
- App type: minimal frontend SPA.
- Entry: `src/main.tsx`.
- Root component: `src/App.tsx`.
- Global stylesheet: `src/index.css`.
- Build config: `vite.config.ts`.
- TS project refs: `tsconfig.json` -> `tsconfig.app.json`, `tsconfig.node.json`.

## 2) Package Manager

- Preferred package manager: Yarn (from `PROJECT_BASIS.md`).
- No lockfile is currently committed.
- Use Yarn commands in docs and examples.
- If Yarn is unavailable, use npm equivalents.

## 3) Build / Run / Lint / Test Commands

### Install
- `yarn install`
- npm fallback: `npm install`

### Development
- `yarn dev`
- Runs Vite dev server.

### Build
- `yarn build`
- Executes `tsc -b && vite build`.
- This is the main validation gate right now (typecheck + production bundle).

### Preview
- `yarn preview`

### Lint
- No lint tooling is configured yet.
- Do not assume `yarn lint` exists.
- If linting is requested, add ESLint (and scripts/config) first.

### Test
- No test runner is configured yet.
- Do not assume `yarn test` exists.

### Running a Single Test (Important)
- Single-test execution is currently unavailable because no test framework is installed.
- If Vitest is added later, use patterns like:
  - `yarn vitest path/to/file.test.ts`
  - `yarn vitest path/to/file.test.ts -t "test name"`
- Until test tooling exists in `package.json`, treat the above as future guidance.

## 4) TypeScript and Compiler Constraints

From `tsconfig.app.json` and `tsconfig.node.json`:

- `strict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noFallthroughCasesInSwitch: true`
- `moduleResolution: "Bundler"`
- `jsx: "react-jsx"`
- `noEmit: true`

Agent implications:

- Avoid `any`; prefer explicit and narrow types.
- Remove unused declarations while editing.
- Keep switch logic exhaustive or safely guarded.
- Keep app code under `src/`; keep Vite/node config types at root config files.

## 5) Code Style Guidelines

### Formatting
- Use single quotes in TS/TSX imports and strings.
- Do not add semicolons in TS/TSX.
- Keep existing CSS style (semicolons in CSS are fine).
- Prefer small, readable components and avoid premature abstraction.

### Imports
- Use ESM imports only.
- Keep import order stable:
  1. React / third-party packages
  2. Style side-effect imports (e.g., `antd/dist/reset.css`)
  3. Local imports
- Avoid deep and unnecessary re-export chains.

### React / TSX
- Prefer function components.
- Component names use PascalCase.
- Custom hooks use `useXxx` naming.
- Keep heavy business logic out of presentational components.

### Naming
- Variables and functions: camelCase.
- Types/interfaces/type aliases: PascalCase.
- True constants: UPPER_SNAKE_CASE.
- React component file names: PascalCase where appropriate.

### Types
- Model domain structures with explicit types.
- Prefer unions/literals over broad primitives where possible.
- Prefer `unknown` at boundaries, then narrow.
- Extract shared types when reuse becomes clear.

### Error Handling
- Fail fast on impossible states.
- Do not silently swallow exceptions.
- Surface actionable error information in logic layers.
- Keep end-user messaging in the UI layer.

### Comments
- Do not add comments for obvious code.
- Add brief comments only for non-obvious constraints or edge cases.

## 6) Architecture and Decoupling

- Preserve UI/core decoupling from `PROJECT_BASIS.md`.
- UI components should focus on rendering and interaction dispatch.
- Reusable business logic belongs in hooks/services/domain modules.
- Isolate browser/platform-specific APIs behind adapters.
- Keep code portable enough for future React Native-oriented reuse of core logic.

Suggested structure as the app grows:

- `src/core/` core domain logic
- `src/features/` feature-sliced UI + state
- `src/platform/web/` web adapters
- `src/components/` shared presentational components
- `src/services/` external I/O wrappers
- `src/types/` shared type definitions

## 7) Styling Baseline

- Keep `antd/dist/reset.css` imported in `src/main.tsx`.
- Keep global baseline styles in `src/index.css`.
- Avoid broad global overrides unless there is a clear reason.

## 8) Documentation Agreement

- LLM-authored docs belong in `LLM-Working/`.
- Daily logs: `YYYYMMDD.md`.
- Persistent docs: uppercase underscore names (example: `API_CONTRACT.md`).
- When conventions change, update docs in the same task.

## 9) Cursor / Copilot Rules

- Checked for `.cursor/rules/`, `.cursorrules`, `.github/copilot-instructions.md`.
- None were found in this repository at the time this file was written.
- If these files appear later, treat them as higher-priority local instructions.

## 10) Practical Agent Workflow

- Before edits: inspect touched files for existing patterns.
- During edits: keep changes minimal, typed, and style-consistent.
- Validation baseline after changes:
  - `yarn build`
  - optionally `yarn dev` for manual smoke checks.
- Do not claim lint/test execution unless tooling exists and was actually run.
