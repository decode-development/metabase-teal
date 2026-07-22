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

Brand-tinted colours in the UI derive from a single `--mb-color-core-brand` value, which upstream generates from the `brand` theme key — so overriding `brand` cascades through the whole brand ramp. Changing the theme files below (plus the font setting) is sufficient to retheme the entire application.

**Modified files:**
- `frontend/src/metabase/ui/colors/constants/themes/light.ts`
- `frontend/src/metabase/ui/colors/constants/themes/dark.ts`

### Font

The default UI font is **Poppins** (already bundled with Metabase upstream). Changed in:
- `src/metabase/appearance/settings.clj` — `:default "Poppins"`

### Dark-mode sidebar legibility

Upstream colours the selected/hover sidebar item's text and icon with the brand colour itself. On our dark theme that is teal-on-teal (the background is a brand tint), so it fails contrast. We point the selected/hover **foreground** at the `text-selected` token (white in dark, neutral in light) while leaving the tinted background as-is. Patched in:
- `frontend/src/metabase/nav/containers/MainNavbar/SidebarItems/SidebarItems.styled.tsx`
- `frontend/src/metabase/nav/containers/MainNavbar/SidebarItems/SidebarLink.tsx`

These are shared upstream components (not isolated Teal files), so they can conflict on a sync if upstream restyles the navbar — see [Resolving a sync conflict](#resolving-a-sync-conflict).

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
| Clean rebase | `master` is rebased and **force-pushed** automatically; that push to `master` triggers a Docker build |
| Conflicts | The rebase is aborted and the **job fails**, with a step-by-step resolution runbook in the job summary and an error annotation on the failure notification |

**Trigger:** Daily at 06:00 UTC, and available as a manual trigger.

**Requires:** A repository secret named `SYNC_TOKEN` — a fine-grained PAT scoped to this repo with **Contents** and **Workflows** read/write permissions. A PAT (rather than the default `GITHUB_TOKEN`) is required because pushes made with `GITHUB_TOKEN` do not trigger other workflows — the force-push to `master` needs to trigger the Docker build.

#### Why conflicts fail the job instead of opening a PR

This is non-standard, so it's worth stating plainly. Landing a sync **rewrites `master`** (rebase + force-push). GitHub's "Merge" button cannot do that: because our Teal commits are already on `master`, merging a rebased branch would *duplicate* them. There is therefore no mergeable PR for a sync. Issues are disabled on this fork, so the conflict is surfaced by **failing the workflow** — the resolution runbook is written to the run summary — and you land the resolution with a force-push (below).

#### Resolving a sync conflict

The failed run's summary contains the exact commands for that specific release; the shape is always:

```bash
git fetch origin && git checkout master && git reset --hard origin/master
git remote add upstream https://github.com/metabase/metabase.git 2>/dev/null || true
git fetch upstream tag <TAG> --no-tags

# Replay our commits onto the new release (<OLD_BASE> is printed in the summary):
git rebase --onto <TAG> <OLD_BASE>
# ...resolve the <<<<<<< markers, then:
git add -A && git rebase --continue

# Land it (rewrites master) — the master push triggers the Docker build:
git push --force-with-lease origin HEAD:master
```

Only files this fork also modifies can conflict — in practice the theme files and the two sidebar components listed under [Branding](#branding). **Keep the Teal values**; the upstream values for those keys will always be wrong for this fork. The next daily run (or a re-run) goes green once `<TAG>` is on `master`.

### Docker Publishing — `teal-docker-publish.yml`

Builds the Metabase OSS image from the root `Dockerfile` and publishes it to the GitHub Container Registry (GHCR).

```bash
docker pull ghcr.io/decode-development/metabase-teal:latest
docker pull ghcr.io/decode-development/metabase-teal:v0.61.2  # specific version
```

**Triggers:**
- Push to `master` — the clean-sync path force-pushes `master`, which fires this build. (We can't trigger on the release tag: GitHub only runs a workflow that exists at the pushed ref, and the upstream tag commit carries no Teal workflow files.)
- Manual dispatch — accepts an optional version *label*, defaults to the current latest upstream release

> **Note:** The image is always built from `master` (the branded, rebased tip), never from the upstream tag commit — the tag itself carries no Teal branding. On a `master`-push build the image is labelled with the latest upstream release; on manual dispatch the `version` input labels it. Either way the content is always `master`.

> **Note:** The build compiles the full frontend and backend from source and takes approximately 60–90 minutes on a standard GitHub-hosted runner. Layer caching (`type=gha`) reduces this on subsequent builds where the system setup layers are warm.
