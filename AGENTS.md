# Repository Workflow

When the user asks to "commit and push" or "커밋 푸시", run the repository verification commands before committing:

```text
corepack pnpm build
corepack pnpm typecheck
corepack pnpm test
corepack pnpm lint
git diff --check
```

Only after all checks pass, stage the intended changes, create a descriptive commit, and push the current work to `origin/main`. Do not commit or push when the user has not requested it. Report any verification failure before taking commit or push action.
