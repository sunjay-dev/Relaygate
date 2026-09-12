# Contributing

Thank you for considering a contribution to Relaygate. Bug reports, documentation improvements, tests, and focused feature work are all welcome.

## Before you start

- Search existing issues and pull requests to avoid duplicate work.
- For significant behavior, security, or architectural changes, open an issue first to discuss the approach.
- Do not include `.env` files, access tokens, API keys, real customer data, or URLs containing secrets.

## Local setup

Requirements: Node.js 24+, pnpm 10, and Corepack.

```bash
corepack enable
pnpm install --frozen-lockfile
Copy-Item .env.example .env # PowerShell
# On macOS/Linux: cp .env.example .env
```

Set a non-default `PROXY_TOKEN` in `.env`, then run the development server:

```bash
pnpm dev
```

## Making a change

1. Create a focused branch from `main`.
2. Keep each pull request limited to one coherent change.
3. Preserve the proxy's server-to-server security model. In particular, do not weaken authentication, destination validation, header filtering, or secret handling without an explicit security review.
4. Add or update focused tests when changing behavior. The project does not yet have an automated test suite, so new test infrastructure is welcome when it remains lightweight and maintainable.
5. Update [`README.md`](README.md) and [`.env.example`](.env.example) whenever API behavior, configuration, deployment, or security guidance changes.

## Validation

Before opening a pull request, run:

```bash
pnpm typecheck
pnpm build
```

Also manually verify relevant API behavior. At a minimum, confirm that `/health` responds successfully and that `/proxy` still rejects missing or invalid bearer tokens.

## Pull requests

Use a clear title and describe:

- What changed and why.
- How you tested it.
- Any configuration, deployment, compatibility, or security impact.

Keep commits understandable and avoid unrelated formatting changes. Maintainers may request revisions, additional tests, or documentation before merging.

## Reporting security issues

Please do not disclose a suspected vulnerability in a public issue. Contact the maintainer privately using the email address in the latest Git commit, include reproduction details and impact, and allow reasonable time for a fix before public disclosure.

## License

By contributing, you agree that your contributions are licensed under the project's [MIT License](LICENSE).
