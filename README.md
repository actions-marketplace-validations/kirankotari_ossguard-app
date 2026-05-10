# OSSGuard App

**GitHub Action that automatically scans PRs for [OpenSSF](https://openssf.org/) security best practices.**

[![CI](https://github.com/kirankotari/ossguard-app/actions/workflows/ci.yml/badge.svg)](https://github.com/kirankotari/ossguard-app/actions/workflows/ci.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/kirankotari/ossguard-app/badge)](https://scorecard.dev/viewer/?uri=github.com/kirankotari/ossguard-app)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

> Part of the [OSSGuard](https://github.com/kirankotari/ossguard) project.

## Quick Start

Add this workflow to your repository at `.github/workflows/ossguard.yml`:

```yaml
name: OSSGuard

on:
  pull_request:
    branches: [main]

permissions:
  contents: read
  pull-requests: write
  statuses: write

jobs:
  security-review:
    name: Security Review
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: kirankotari/ossguard-app@main
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

That's it! Every PR will now get an automated security review.

## What It Does

When a PR is opened or updated, OSSGuard automatically:

1. **Scans** the repository and PR diff for security best practices
2. **Comments** on the PR with a detailed security review table
3. **Sets a status check** that can block merges if critical issues are found

### What You'll See on Your PR

OSSGuard posts a comment like this directly on your pull request:

> ### OSSGuard Security Review
>
> | Check | Status | Severity | Details |
> |-------|--------|----------|---------|
> | Dependency Pinning | :warning: Warn | Warning | 2 action(s) not pinned to SHA |
> | Security Policy | :white_check_mark: Pass | Warning | SECURITY.md found at `SECURITY.md` |
> | License | :white_check_mark: Pass | Warning | Apache-2.0 license detected |
> | Secrets Scan | :white_check_mark: Pass | Error | No secrets detected in PR diff |
> | Container Security | :white_check_mark: Pass | Warning | Dockerfile follows best practices |
> | CodeQL / SAST | :white_check_mark: Pass | Warning | CodeQL configured in `.github/workflows/codeql.yml` |
> | Branch Protection | :white_check_mark: Pass | Info | Branch protection enabled on `main` |
> | Dependency Review | :white_check_mark: Pass | Info | Dependency management: Dependabot |
>
> **7 passed** | **1 warning**
>
> Fix the issues above to improve your project's security posture.

It also sets a **commit status check** on the PR:
- **Green** (success) — all checks passed
- **Yellow** (neutral) — warnings found, but not blocking
- **Red** (failure) — critical issues found (e.g., leaked secrets)

## Security Checks (8 Analyzers)

| Check | What It Does |
|-------|-------------|
| **Dependency Pinning** | Verifies GitHub Actions are pinned to commit SHAs, not mutable tags |
| **Security Policy** | Checks for SECURITY.md (vulnerability disclosure policy) |
| **License** | Verifies a LICENSE file exists |
| **Secrets Scan** | Scans PR diff for leaked credentials (AWS keys, API tokens, private keys) |
| **Container Security** | Checks Dockerfile best practices (pinned base images, non-root USER) |
| **CodeQL / SAST** | Checks for CodeQL, Semgrep, SonarQube, or Snyk workflows |
| **Branch Protection** | Checks default branch for required reviews, status checks, admin enforcement |
| **Dependency Review** | Checks for Dependabot, Renovate, or dependency-review-action |

## Configuration (Optional)

Add `.github/ossguard.yml` to customize checks:

```yaml
checks:
  pin-actions:
    enabled: true
    severity: warning    # error | warning | info
  security-policy:
    enabled: true
    severity: warning
  license:
    enabled: true
    severity: warning
  secrets:
    enabled: true
    severity: error      # Secrets always block
  container:
    enabled: true
    severity: warning
  codeql:
    enabled: true
    severity: warning
  branch-protection:
    enabled: true
    severity: info
  dependency-review:
    enabled: true
    severity: info

# Minimum severity to block PR merges via status check
blockOn: error

# Comment style: "full" table or "compact" bullet list
commentStyle: full
```

If no config file is present, sensible defaults are used.

## Development

```bash
npm install
npm test             # Run tests
npm run lint         # Run ESLint
npm run build        # Compile TypeScript
npm run build:action # Build bundled action
```

## Related

- [ossguard](https://github.com/kirankotari/ossguard) — Documentation and coordinated releases
- [ossguard-python](https://github.com/kirankotari/ossguard-python) — Python CLI (`pip install ossguard`)
- [ossguard-go](https://github.com/kirankotari/ossguard-go) — Go CLI (`brew install kirankotari/tap/ossguard`)
- [ossguard-npm](https://github.com/kirankotari/ossguard-npm) — Node.js CLI (`npx ossguard`)

## License

Apache-2.0
