# Ownership and security review

Review date: 28 October 2026. Scope: repository documentation, ownership signals,
credential ignore rules, tracked paths, and locally reachable Git objects.

## Owner confirmations and licensing decisions

Htet Ko Oo confirmed sole original authorship, no other developer contributions,
and no prior project license. Governing-law and jurisdiction clauses are omitted
at the owner's request; no country or court is implied by this omission.

The custom LICENSE permits viewing, recruitment/portfolio evaluation, limited
local evaluation and contribution preparation, and normal use of the hosted app.
Independent deployment, redistribution, modification for independent use,
sublicensing, and commercial reuse require express written permission.
Recruitment evaluation by a business is expressly permitted. GitHub platform
rights, mandatory statutory rights, and third-party licenses are preserved.
CONTRIBUTING.md requires owner approval and appropriate separate permission
before incorporating externally owned contributions; it does not assign copyright.
README describes the same permissions and restrictions.

## Ownership and license findings

- No earlier project-level LICENSE, COPYING, NOTICE, or CONTRIBUTING file was
  found in the inspected current tree or their locally reachable path history.
- Reachable commit author metadata showed one author. Metadata does not prove
  provenance or exclude copied material; the owner confirmation is also relied on.
- No conflicting project license or contributor ownership claim was identified
  within this scope. External releases, unrecorded agreements, and third-party
  asset provenance cannot be established by Git inspection alone.
- Installed direct dependency metadata includes MIT, Apache-2.0, and ISC licenses.
  These components are excluded from the owner's proprietary claim. This review
  is not a complete transitive-dependency or distributed-notices audit.
- The Edge Function imports `jsr:@negrel/webpush` outside the direct package.json
  dependency inventory. Its resolved upstream license and notices, bundled icon
  sources (including Lucide), brand assets, and any copied snippets still require
  provenance/notice verification before claiming complete third-party compliance.
- No package license metadata was changed. `private: true` prevents accidental
  package publication; it does not itself grant or enforce a copyright license.

## Credential review

The existing ignore rules cover `.env*` (with `.env.example` explicitly allowed),
`.vercel`, Supabase temporary directories, dependencies, build output, and PEM
files. Additional rules now exclude common private-key/keystore extensions and
root-level local credential stores. Ignore rules do not untrack existing files.

The inspected baseline contained 201 tracked files and 1,052 locally reachable
Git objects. A pattern scan examined 697 textual blob versions/worktree entries;
9 binary or oversized blobs were skipped. No tracked sensitive-path candidates
or secret-pattern candidates were detected. `.env.example` contains placeholders,
not deployment credentials. No secret values are included in this report.

Checks included common provider token patterns, private-key headers, and JWT
payload roles indicating privileged Supabase credentials. This is a heuristic
scan, not proof that the repository contains no secrets. Unreachable objects,
unfetched remote refs/PRs, binary image contents, external logs, provider settings,
and deployment artifacts were not audited. Application authorization and runtime
security were outside this documentation review.

If an actual leaked credential is later found, revoke/rotate it at the provider;
adding an ignore rule does not revoke it. No Git history was changed or deleted.

## Legal limitations and professional review

- Public GitHub repositories permit platform viewing/forking under GitHub's Terms
  of Service. The custom license cannot promise to prevent every copy or override
  those rights. Public availability also cannot technically stop misuse.
- Copyright protects original expression, not the underlying product idea or
  functionality. A separately implemented similar product is not automatically
  prohibited by this license.
- A qualified lawyer should review enforceability, acceptance of conditions,
  termination, warranty/liability exclusions, statutory exceptions, and the
  implications of omitting governing law and forum selection. This document
  makes no claim that the custom terms have been professionally validated.
- If an earlier permissive license is later discovered, this notice cannot simply
  cancel rights already granted for that earlier material/version.
- Before accepting external original code, arrange an owner-specific ICLA (and
  corporate authorization where needed) with explicit commercial, sublicensing,
  relicensing, and relevant patent rights. No signed CLA is supplied here.
- Branding ownership is asserted only for original owner-owned assets; trademark
  registration or exclusive rights to the word “DayFlow” have not been verified.

## Files changed and validation

Created `LICENSE`, `CONTRIBUTING.md`, and this report. Appended a Copyright &
License section to `README.md` while preserving its original byte content.
Extended `.gitignore` with credential patterns. No application source, dependency,
architecture, Git history, deployment, or release was changed. No commit or push
was performed.

Validation: original README prefix comparison, local Markdown links, credential
ignore examples, Markdown formatting, and whitespace diff checks. Application
build/tests are unnecessary for these documentation and ignore-rule changes.

## References

- [GitHub Terms of Service](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service)
- [GitHub: Licensing a repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)
- [WIPO: What can I protect with copyright?](https://www.wipo.int/en/web/copyright/protection)
- [Apache ICLA](https://www.apache.org/licenses/icla.pdf) — a structural reference,
  not an agreement adopted for DayFlow; the owner needs a tailored agreement.
