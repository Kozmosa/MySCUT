> 历史归档：本文不再维护。仓库历史脱敏后，文中记录的旧提交哈希均已失效。

# ReleaseImpl0228

## Implementation Date

- 2026-02-28

## Related Commit Hashes

- `b3e66fc`

## Implementation Details

- Added automated release entry in `package.json` via `npm run release <version_code>`.
- Implemented end-to-end release script at `scripts/release.mjs` to orchestrate:
  - version argument parsing and semver-like `x.y.z` validation
  - strict version bump check against current `package.json` version
  - enforce running on `main` branch and prevent duplicate local tags
  - recursive submodule init/update to latest remote commits
  - package version update and full build execution (`npm run build:full`)
  - Android Studio opening with interactive blocking confirmation for APK build completion
  - APK discovery strategy with priority:
    - `app-release.apk` preferred
    - fallback to `app-debug.apk`
  - artifact normalization to `qmm-v<version>.apk`
  - update root `versions.json` (`latest` + `versions.<version>`)
  - sync `qmm-latest.apk` and `versions.json` into manual submodule root-assets and push submodule `main`
  - git commit/tag/push for main repo release preparation

- Current publishing mode:
  - release script itself does **not** call `gh release create/upload`
  - after commit/tag push, GitHub Actions workflow handles Release creation and asset upload

- Added root metadata file `versions.json` to persist release history from automation onward:
  - `versions.<version>` stores per-version release metadata and asset links
  - `latest` mirrors the newest published version fields
  - asset links use GitHub Release download URLs

## Notes

- This implementation aligns with existing build/submodule scripts and extends them into a single release pipeline entry point.
- `scripts/release.mjs` still contains API-based helper functions for GitHub release operations, but the active main flow currently does not invoke them.
- Related references: [[PROJECT_BASIS#3) 技能约定：保存实现文档]], [[20260226]]
