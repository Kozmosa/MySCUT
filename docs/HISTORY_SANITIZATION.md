# Repository history sanitization

The public Git history was rewritten on 2026-07-17 to remove legacy personal-data fixtures, superseded sensitive implementation records, insecure gateway implementation paths, generated audit artifacts, and all APK/IPA blobs from every retained branch and tag.

## Required action for existing clones

All commit IDs created before the rewrite are invalid. Existing clones must not merge, rebase, cherry-pick, or push old history back to the public repository. Delete or securely archive the old clone, then create a fresh clone with submodules:

```bash
git clone --recurse-submodules https://github.com/Kozmosa/MySCUT.git
```

Fork owners and downstream mirrors must independently remove the old history or recreate their repositories from the sanitized refs. Third-party caches and previously downloaded copies are outside the technical control of this repository.

## Security contact

If an old raw URL, cached object, credential, or personal identifier remains accessible, report it privately through [GitHub Private Vulnerability Reporting](https://github.com/Kozmosa/MySCUT/security/advisories/new). Do not post the affected value in a public Issue.
