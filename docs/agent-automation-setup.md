# Agent Automation Setup

This setup enables:
1. User submits feedback
2. Admin approves feedback for agent run
3. App dispatches GitHub workflow
4. Workflow runs Codex to edit code, creates PR, and optionally triggers deploy

## 1) Repository Secrets (GitHub)
Add these in GitHub -> Settings -> Secrets and variables -> Actions -> Secrets:

- `OPENAI_API_KEY` (required for Codex agent auto-edit)
- `VERCEL_DEPLOY_HOOK_URL` (optional but recommended)
- `AGENT_CHANGE_COMMAND` (optional override/custom command)

Notes:
- If `OPENAI_API_KEY` is set, workflow runs `openai/codex-action@v1`.
- If `AGENT_CHANGE_COMMAND` is also set, it runs after Codex step.
- PR is only created when files actually changed.

## 2) Vercel Environment Variables
Set in Vercel project -> Settings -> Environment Variables:

- `AGENT_AUTOMATION_WEBHOOK_URL=https://<your-domain>/api/automation/github-dispatch`
- `AGENT_AUTOMATION_BEARER_TOKEN=<strong-random-token>`
- `GITHUB_DISPATCH_TOKEN=<github_pat_with_repo_scope>`
- `GITHUB_OWNER=<your-github-org-or-user>`
- `GITHUB_REPO=<your-repo-name>`
- `VERCEL_DEPLOY_HOOK_URL=<optional-vercel-deploy-hook-url>`

## 3) Required GitHub Workflow
This repo includes:
- `.github/workflows/feedback-approved-agent.yml`

It listens for `repository_dispatch` event type `feedback-approved`.

## 4) End-to-end flow in app
1. User submits feedback.
2. User clicks `Request Agent Change`.
3. Admin clicks `Approve Agent Run` and adds approval comment.
4. Admin clicks `Run Agent Now`.
5. App calls `/api/automation/github-dispatch`.
6. GitHub workflow runs and creates PR with Codex changes.
7. Vercel deploy hook runs if configured.

## 5) Validation checklist
- GitHub Actions run appears for `feedback-approved`.
- Logs show `Run Codex Agent` step executed.
- PR is created under branch `agent/feedback-<id>`.
- Vercel deployment appears after merge (or via deploy hook).
