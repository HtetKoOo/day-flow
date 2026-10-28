# Contributing to DayFlow

Thank you for helping improve DayFlow. This public repository is available for
review under the [DayFlow Source-Available Proprietary License](LICENSE).
Public visibility does not grant unrestricted reuse or an open-source license.
You can use the hosted application without contributing.

## Reporting issues

Search existing issues before opening a new one. For bugs, include reproduction
steps, expected and actual behavior, relevant browser/device details, and a
redacted screenshot or error message when useful. For feature requests, explain
the problem and the proposed user benefit.

Do not post passwords, API keys, verification codes, private timetable details,
or other personal information. Report suspected security vulnerabilities privately
to **htetkooo2532@gmail.com** rather than in a public issue.

## Before opening a pull request

Discuss substantial changes in an issue first so the owner can confirm scope and
contribution permissions. The license permits local evaluation, issue investigation,
and changes made solely to propose a contribution to this project; it does not
permit an independent deployment or product. GitHub platform rights still apply.

- Work in a focused branch or fork, preserving copyright and license notices.
- Follow existing architecture, naming, formatting, and accessibility patterns.
- Keep the change scoped; explain new dependencies before adding any.
- Update relevant documentation and meaningful tests for behavior changes.
- Include the problem, resulting behavior, validation results, and screenshots
  for UI changes in the pull request.
- Do not include secrets, generated build output, or unrelated changes.

Use the setup and validation instructions in [README.md](README.md). Run the
checks relevant to the change; `pnpm check` includes database checks and requires
the documented local Supabase setup. Report any checks you could not run.
Documentation-only changes should be checked for formatting and valid links.

## Review and approval

Htet Ko Oo reviews contributions for correctness, security, privacy, accessibility,
maintainability, tests, and consistency with DayFlow's direction. Address review
feedback and resolve failed relevant checks. **Owner approval and any required
contribution agreement must be obtained before merging.** A pull request may be
revised or declined; submission does not guarantee acceptance or release.

## Copyright and contribution permission

You retain copyright in your original contribution unless a separate signed
agreement explicitly transfers it. Do not submit code or assets you lack authority
to contribute, including employer-owned work without authorization. Identify
third-party material, its source, and license; do not remove upstream notices.

For original external contributions, the recommended approach is an
**owner-specific Individual Contributor License Agreement (ICLA)** reviewed by a
lawyer, completed before incorporation. It should preserve contributor ownership
while expressly granting the owner the worldwide, perpetual, irrevocable,
royalty-free rights needed to use, reproduce, modify, distribute, sublicense,
commercialize, and relicense the contribution. It should address relevant patent
rights, authority, third-party provenance, and employer/corporate authorization.
A corporate CLA may be needed for company-owned contributions.

This guidance is not itself a CLA, a copyright assignment, or a grant of those
broader rights. The owner must arrange and record an appropriate agreement or
other express written permission before incorporating a contribution, where
applicable. A Developer Certificate of Origin alone does not supply additional
commercial relicensing rights. Existing third-party licenses remain applicable.

For licensing or contribution-agreement questions, contact
**htetkooo2532@gmail.com** before submitting substantial work.
