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
  - recursive submodule init/update to latest remote commits
  - package version update and full build execution (`npm run build:full`)
  - Android Studio opening with interactive blocking confirmation for APK build completion
  - APK discovery strategy with priority:
    - `app-release.apk` preferred
    - fallback to `app-debug.apk`
  - artifact normalization to `qmm-v<version>.apk`
  - git commit/tag/push sequence for release preparation
  - GitHub Release creation/update and asset upload

- Added root metadata file `versions.json` to persist release history from automation onward:
  - `versions.<version>` stores per-version release metadata and asset links
  - `latest` mirrors the newest published version fields
  - asset links use GitHub Release download URLs

- Release asset upload now includes:
  - `qmm-v<version>.apk`
  - `versions.json`

- Added dual publishing path for robustness:
  - primary: GitHub CLI (`gh`) if available
  - fallback: GitHub REST API

- Added credential fallback behavior:
  - use `GITHUB_TOKEN` or `GH_TOKEN` from environment first
  - if `gh` is unavailable and no env token exists, prompt user interactively for `GITHUB_TOKEN` (hidden input)

## Notes

- This implementation aligns with existing build/submodule scripts and extends them into a single release pipeline entry point.
- Related references: [[PROJECT_BASIS#3) 技能约定：保存实现文档]], [[20260226]]
