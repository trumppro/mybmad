# Security Policy

> ## oahs platform (`packages/`, `apps/`) — read this part first
>
> **Everything below this box is upstream BMAD-METHOD's policy, carried with the fork.**
> It points at BMAD's advisory page and Discord, promises a 48h/30d response, and scopes
> itself to "BMad Method core framework code". None of that covers the oahs spine, API,
> runner or dispatcher — and a researcher who followed it would disclose an unfixed oahs
> vulnerability to an unrelated organisation that cannot patch it, while the maintainer
> who can never hears about it.
>
> **In scope for oahs:** `packages/*`, `apps/*`, `scripts/`, `tools/oahs-bootstrap.sh`,
> `tools/team-seed.sh`, and the Dockerfiles under `apps/oahs/`.
>
> **How to report:** open a private vulnerability report through this repository's
> GitHub Security tab (Security → Report a vulnerability). If that is not enabled, open a
> normal issue saying only that you have a security report and asking for a contact — do
> not put details in a public issue.
>
> **Supported versions:** `main`, and only `main`. Nothing is published to npm or a
> container registry, so there is no released artifact to backport to. See
> [CHANGELOG-oahs.md](CHANGELOG-oahs.md).
>
> **Known posture, stated so you don't have to find it:** evidence collected on a
> developer machine is only as strong as the honest-operator assumption behind it, and
> the trust boundary is written up in [OAHS.md](OAHS.md) under "Trust boundary". Reports
> that the honest-operator floor is not a cryptographic guarantee are already known;
> reports that something defeats a guard the docs claim to have are very welcome.
>
> **No bounty.** There is no budget. Credit in the changelog, gladly.

---


## Supported Versions

We release security patches for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |
| < Latest | :x:               |

We recommend always using the latest version of BMad Method to ensure you have the most recent security updates.

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

### How to Report

**Do NOT report security vulnerabilities through public GitHub issues.**

Instead, please report them via one of these methods:

1. **GitHub Security Advisories** (Preferred): Use [GitHub's private vulnerability reporting](https://github.com/bmad-code-org/BMAD-METHOD/security/advisories/new) to submit a confidential report.

2. **Discord**: Contact a maintainer directly via DM on our [Discord server](https://discord.gg/gk8jAdXWmj).

### What to Include

Please include as much of the following information as possible:

- Type of vulnerability (e.g., prompt injection, path traversal, etc.)
- Full paths of source file(s) related to the vulnerability
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if available)
- Impact assessment of the vulnerability

### Response Timeline

- **Initial Response**: Within 48 hours of receiving your report
- **Status Update**: Within 7 days with our assessment
- **Resolution Target**: Critical issues within 30 days; other issues within 90 days

### What to Expect

1. We will acknowledge receipt of your report
2. We will investigate and validate the vulnerability
3. We will work on a fix and coordinate disclosure timing with you
4. We will credit you in the security advisory (unless you prefer to remain anonymous)

## Security Scope

### In Scope

- Vulnerabilities in BMad Method core framework code
- Security issues in agent definitions or workflows that could lead to unintended behavior
- Path traversal or file system access issues
- Prompt injection vulnerabilities that bypass intended agent behavior
- Supply chain vulnerabilities in dependencies

### Out of Scope

- Security issues in user-created custom agents or modules
- Vulnerabilities in third-party AI providers (Claude, GPT, etc.)
- Issues that require physical access to a user's machine
- Social engineering attacks
- Denial of service attacks that don't exploit a specific vulnerability

## Security Best Practices for Users

When using BMad Method:

1. **Review Agent Outputs**: Always review AI-generated code before executing it
2. **Limit File Access**: Configure your AI IDE to limit file system access where possible
3. **Keep Updated**: Regularly update to the latest version
4. **Validate Dependencies**: Review any dependencies added by generated code
5. **Environment Isolation**: Consider running AI-assisted development in isolated environments

## Acknowledgments

We appreciate the security research community's efforts in helping keep BMad Method secure. Contributors who report valid security issues will be acknowledged in our security advisories.

---

Thank you for helping keep BMad Method and our community safe.
