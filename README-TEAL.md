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

This fork tracks upstream Metabase release-for-release. Rather than *merging* upstream into `master`, it **rebases** the handful of Teal commits on top of each new upstream release tag, so `master` stays a clean, linear history:

```
<upstream release tag>  ──►  Apply Teal branding  ──►  <automation commits>   (master)
```

This is a **rebasing fork**: every sync rewrites `master` — our commits get new SHAs on top of the newer upstream base — and force-pushes it. That is expected and normal for this repo. Do not "fix" the history by merging upstream in; that is what created the tangled history this layout replaced.

---

## Automation

### Workflow Management — `teal-enforce-workflows.yml`

Metabase upstream ships ~100 GitHub Actions workflows. On a fork, all of them are inherited and enabled by default. The enforce workflow disables any workflow whose filename does not start with `teal-`, keeping only this fork's own automations active.

**Triggers:**
- Automatically on any push to `master` that touches `.github/workflows/` — catches new upstream workflows arriving via a sync
- Manual dispatch — use this for the **initial bulk disable** after first push

**Initial setup:** after pushing this repository for the first time, run the workflow manually via:
> Actions → Enforce Workflow Allowlist → Run workflow

### Upstream Sync — `teal-sync-upstream-release.yml`

Daily, rebases this fork's Teal commits onto the latest upstream release tag (see [Upstream](#upstream)).

| Outcome | Result |
|---------|--------|
| Clean rebase | `master` is rebased and **force-pushed** automatically; the release tag is pushed to the fork, triggering a Docker build |
| Conflicts | The rebase is aborted and a **GitHub issue** is opened with step-by-step resolution instructions |

**Trigger:** Daily at 06:00 UTC, and available as a manual trigger.

**Requires:** A repository secret named `SYNC_TOKEN` — a fine-grained PAT scoped to this repo with **Contents**, **Workflows**, and **Issues** read/write permissions. A PAT (rather than the default `GITHUB_TOKEN`) is required so the pushed release tag can trigger the Docker workflow.

#### Why conflicts open an issue, not a PR

This is non-standard, so it's worth stating plainly. Landing a sync **rewrites `master`** (rebase + force-push). GitHub's "Merge" button cannot do that: because our Teal commits are already on `master`, merging a rebased branch would *duplicate* them. There is therefore no mergeable PR for a sync — so conflicts reach you as an **issue**, and you land the resolution with a force-push (below) rather than a merge.

#### Resolving a sync conflict

The opened issue contains the exact commands for that specific release; the shape is always:

```bash
git fetch origin && git checkout master && git reset --hard origin/master
git remote add upstream https://github.com/metabase/metabase.git 2>/dev/null || true
git fetch upstream tag <TAG> --no-tags

# Replay our commits onto the new release (<OLD_BASE> is printed in the issue):
git rebase --onto <TAG> <OLD_BASE>
# ...resolve the <<<<<<< markers, then:
git add -A && git rebase --continue

# Land it (rewrites master) and trigger the Docker build:
git push --force-with-lease origin HEAD:master
git push origin <TAG>
```

Only files this fork also modifies can conflict — in practice the three branding files above. **Keep the Teal values**; the upstream values for those keys will always be wrong for this fork. Close the issue once the tag is on `master`.

### Docker Publishing — `teal-docker-publish.yml`

Builds the Metabase OSS image from the root `Dockerfile` and publishes it to the GitHub Container Registry (GHCR).

```bash
docker pull ghcr.io/decode-development/metabase-teal:latest
docker pull ghcr.io/decode-development/metabase-teal:v0.61.2  # specific version
```

**Triggers:**
- Push of an upstream release tag to this fork (the clean-sync path)
- Manual dispatch — accepts an optional version *label*, defaults to the current latest upstream release

> **Note:** The image is always built from `master` (the branded, rebased tip), never from the upstream tag commit — the tag itself carries no Teal branding. The `version` input only labels the image; the content is always `master`.

> **Note:** The build compiles the full frontend and backend from source and takes approximately 60–90 minutes on a standard GitHub-hosted runner. Layer caching (`type=gha`) reduces this on subsequent builds where the system setup layers are warm.
