# Metabase Teal

A custom-branded fork of [Metabase](https://github.com/metabase/metabase) (OSS edition), maintained under the terms of the [AGPL v3 license](LICENSE-AGPL.txt).

No functional changes are made to the core Metabase product. All upstream features, connectors, and APIs are preserved as-is.

---

## Branding

### Colour Palette

| Role | Hex | Used for |
|------|-----|----------|
| Primary brand | `#135756` | Buttons, links, interactive elements |
| Nav background | `#012D2C` | Top navigation and admin bar |
| Nav deep | `#001A19` | Inverse/depth nav backgrounds |
| Accent gold | `#E2B018` | Warnings and highlights |
| Accent cream | `#FDF0C8` | Warning backgrounds |
| Subtle background | `#E0E6E6` | Light UI backgrounds |

All colour references in the UI are CSS variables that derive from a single `--mb-color-brand` value. Changing the three files below is sufficient to retheme the entire application.

**Modified files:**
- `frontend/src/metabase/ui/colors/constants/themes/light.ts`
- `frontend/src/metabase/ui/colors/constants/themes/dark.ts`

### Font

The default UI font is **Poppins** (already bundled with Metabase upstream). Changed in:
- `src/metabase/appearance/settings.clj` — `:default "Poppins"`

---

## Versioning

This fork makes cosmetic changes only and tracks upstream Metabase release-for-release. It uses upstream version tags directly (e.g. `v0.61.2`) — there is no independent versioning scheme. Docker images are published under the same tag, so the image version always corresponds exactly to the underlying Metabase version.

---

## Upstream

This fork syncs to the latest upstream release tag daily, merging it into `master` so our Teal commits always sit on top of a known-stable release.

---

## Automation

### Workflow Management — `teal-enforce-workflows.yml`

Metabase upstream ships ~100 GitHub Actions workflows. On a fork, all of them are inherited and enabled by default. The enforce workflow disables any workflow whose filename does not start with `teal-`, keeping only this fork's own automations active.

**Triggers:**
- Automatically on any push to `master` that touches `.github/workflows/` — catches new upstream workflows arriving via a sync merge
- Manual dispatch — use this for the **initial bulk disable** after first push

**Initial setup:** after pushing this repository for the first time, run the workflow manually via:
> Actions → Enforce Workflow Allowlist → Run workflow

### Upstream Sync — `teal-sync-upstream-release.yml`

Merges the latest upstream release tag into this fork's `master` daily, keeping Teal commits on top of a known-stable release.

| Outcome | Result |
|---------|--------|
| Clean merge | Pushed to `master` automatically; release tag pushed to fork, triggering a Docker build |
| Merge conflicts | Branch `sync/upstream-YYYY-MM-DD` pushed, PR opened for manual resolution |

**Trigger:** Daily at 06:00 UTC, and available as a manual trigger.

**Requires:** A repository secret named `SYNC_TOKEN` — a fine-grained PAT scoped to this repo with Contents, Workflows, and Pull Requests read/write permissions.

**Conflict resolution:** The three branding files above are the most likely to conflict. In each case, keep the Teal values — the upstream values for those specific keys will always be wrong for this fork.

### Docker Publishing — `teal-docker-publish.yml`

Builds the Metabase OSS image from the root `Dockerfile` and publishes it to the GitHub Container Registry (GHCR).

```bash
docker pull ghcr.io/decode-development/metabase-teal:latest
docker pull ghcr.io/decode-development/metabase-teal:v0.61.2  # specific version
```

**Triggers:**
- Push of an upstream release tag to this fork (clean auto-merge path)
- Merge of a `sync/upstream-*` PR into master (conflict-resolution path)
- Manual dispatch — accepts an optional version tag, defaults to the current latest upstream release

> **Note:** The build compiles the full frontend and backend from source and takes approximately 60–90 minutes on a standard GitHub-hosted runner. Layer caching (`type=gha`) reduces this on subsequent builds where the system setup layers are warm.
