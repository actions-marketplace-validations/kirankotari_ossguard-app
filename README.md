# OSSGuard App

**GitHub App that automatically scans PRs for [OpenSSF](https://openssf.org/) security best practices.**

[![CI](https://github.com/kirankotari/ossguard-app/actions/workflows/ci.yml/badge.svg)](https://github.com/kirankotari/ossguard-app/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

> Part of the [OSSGuard](https://github.com/kirankotari/ossguard) project.

## What It Does

When a PR is opened or updated, OSSGuard App automatically:

1. **Scans** the PR for security best practices
2. **Comments** on the PR with a detailed security review table
3. **Sets a status check** that can block merges if issues are found

### Example PR Comment

> ### OSSGuard Security Review
>
> | Check | Status | Severity | Details |
> |-------|--------|----------|---------|
> | Dependency Pinning | :warning: Warning | Warning | 2 action(s) not pinned to SHA |
> | Security Policy | :white_check_mark: Pass | Warning | SECURITY.md found |
> | License | :white_check_mark: Pass | Warning | Apache-2.0 license detected |
> | Secrets Scan | :white_check_mark: Pass | Error | No secrets detected in PR diff |
> | Container Security | :white_check_mark: Pass | Warning | Dockerfile follows best practices |
>
> **4 passed** | **1 warning**

## Security Checks

| Check | What It Does |
|-------|-------------|
| **Dependency Pinning** | Verifies GitHub Actions are pinned to commit SHAs |
| **Security Policy** | Checks for SECURITY.md (vulnerability disclosure) |
| **License** | Verifies a LICENSE file exists |
| **Secrets Scan** | Scans PR diff for leaked credentials (API keys, tokens, private keys) |
| **Container Security** | Checks Dockerfile best practices (pinned images, non-root USER) |

More checks coming soon: Scorecard, SLSA, SBOM, CodeQL, branch protection, dependency review.

## Configuration

Add `.github/ossguard.yml` to your repository:

```yaml
# Which checks to run and their severity
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

# Minimum severity to block PR merges via status check
blockOn: error

# Comment style: "full" table or "compact" bullet list
commentStyle: full
```

If no config file is present, sensible defaults are used.

## Installation

### From GitHub Marketplace (coming soon)

Install the app on your repositories from the GitHub Marketplace.

### Self-Hosted

1. [Create a GitHub App](https://docs.github.com/en/apps/creating-github-apps)
   - **Webhook URL**: Your server URL
   - **Permissions**: Pull requests (read/write), Contents (read), Commit statuses (read/write)
   - **Events**: Pull request

2. Clone and configure:

   ```bash
   git clone https://github.com/kirankotari/ossguard-app.git
   cd ossguard-app
   cp .env.example .env
   # Edit .env with your App ID, private key path, and webhook secret
   ```

3. Run:

   ```bash
   npm install
   npm run build
   npm start
   ```

4. Or with Docker:

   ```bash
   docker build -t ossguard-app .
   docker run -p 3000:3000 --env-file .env ossguard-app
   ```

## Development

```bash
npm install
npm run dev          # Start with ts-node (auto-reload)
npm test             # Run tests
npm run build        # Compile TypeScript
```

Use [smee.io](https://smee.io) to proxy webhooks to your local machine during development.

## Architecture

```
GitHub webhook (PR opened/updated)
       |
  OSSGuard App (Probot)
       |
  +----+----+----+----+
  |    |    |    |    |
 Pin  Sec  Lic  Sec  Container
 Act  Pol  ense rets  Security
       |
  PR Comment + Status Check
```

## Related

- [ossguard](https://github.com/kirankotari/ossguard) — Documentation and coordinated releases
- [ossguard-python](https://github.com/kirankotari/ossguard-python) — Python CLI (`pip install ossguard`)
- [ossguard-go](https://github.com/kirankotari/ossguard-go) — Go CLI (`brew install kirankotari/tap/ossguard`)
- [ossguard-npm](https://github.com/kirankotari/ossguard-npm) — Node.js CLI (`npx ossguard`)

## License

Apache-2.0
