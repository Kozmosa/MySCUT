# Repository history sanitization

The public Git history was rewritten and force-pushed on 2026-07-17 to remove legacy personal-data fixtures, superseded sensitive implementation records, insecure gateway implementation paths, generated audit artifacts, and all APK/IPA blobs from every retained branch and tag.

## Completed repository cleanup

- Every retained public branch and tag was rewritten and force-pushed.
- The obsolete public backup branch was deleted rather than preserved as a reference to the old history.
- The rewritten refs were scanned for known personal identifiers, credential patterns, development-machine paths, removed paths, APK/IPA objects, and unexpectedly large blobs.
- The protected `main` branch now requires the repository quality gate and rejects force pushes and deletion.
- Maintainer working copies were replaced with a fresh clone. The remaining pre-rewrite bundle is encrypted and must never be uploaded or stored as an ordinary public backup.

These checks establish that the sensitive objects are not reachable through the repository's current public branches and tags. They do not establish that every copy outside those refs has been destroyed.

## Required action for existing clones

All commit IDs created before the rewrite are invalid. Existing clones must not merge, rebase, cherry-pick, or push old history back to the public repository. Delete or securely archive the old clone, then create a fresh clone with submodules:

```bash
git clone --recurse-submodules https://github.com/Kozmosa/MySCUT.git
```

Fork owners and downstream mirrors must independently remove the old history or recreate their repositories from the sanitized refs. Third-party caches and previously downloaded copies are outside the technical control of this repository.

## Residual risk boundary

A force push changes public Git references; it cannot recall old clones, forks, mirrors, downloaded archives, or provider-side caches. A detached legacy installer object was still available through a previously known raw cache URL during the post-rewrite verification, even though installer blobs were no longer reachable from any retained branch or tag. The repository therefore does not claim that GitHub has purged every detached object.

Do not publish old commit IDs, raw URLs, cached personal values, or reproduction details in documentation or public discussions. If a credential was ever exposed, revoke or rotate it; history rewriting is not a substitute for credential rotation.

## Security contact

If an old raw URL, cached object, credential, or personal identifier remains accessible, report it privately through [GitHub Private Vulnerability Reporting](https://github.com/Kozmosa/MySCUT/security/advisories/new). Do not post the affected value in a public Issue. Contributors and automated agents must not contact GitHub Support on behalf of the project without explicit maintainer authorization.
