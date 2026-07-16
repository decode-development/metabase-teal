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

All colour references in the UI are CSS variables that derive from a single `--mb-color-brand` value. Changing the two files below is sufficient to retheme the entire application.

**Modified files:**
- `frontend/src/metabase/ui/colors/constants/themes/light.ts`
- `frontend/src/metabase/ui/colors/constants/themes/dark.ts`

### Theme colours are `hsla` literals

Upstream's `themes.unit.spec.ts` requires every theme colour that does not derive from the whitelabel brand to be an `hsla(...)` literal, because static viz parses theme colours server-side and cannot resolve hex-with-`color-mix` expressions. So the theme files hold the palette above as `hsla` values, converted from the original hex (each converts back to the same 8-bit RGB). If you ever need the original definitions again, they were:

| Original value | `hsla` literal in the theme files |
|----------------|-----------------------------------|
| `#135756` | `hsla(179.1, 64.2%, 20.8%, 1)` |
| `#012D2C` | `hsla(178.6, 95.7%, 9%, 1)` |
| `#001A19` | `hsla(177.7, 100%, 5.1%, 1)` |
| `#E2B018` | `hsla(45.15, 80.8%, 49.02%, 1)` |
| `#FDF0C8` | `hsla(45.3, 93%, 88.8%, 1)` |
| `#E0E6E6` | `hsla(180, 11%, 89%, 1)` |
| `#73A09D` | `hsla(176, 19.1%, 53.9%, 1)` |
| `color-mix(in srgb, #E2B018, white 70%)` | `hsla(45.1, 77.7%, 84.7%, 1)` |
| `color-mix(in srgb, #E2B018, black 70%)` | `hsla(45.1, 80.8%, 14.7%, 1)` |
| `color-mix(in srgb, #E2B018, black 50%)` | `hsla(45.1, 80.8%, 24.5%, 1)` |

**Dark `text-hover` override.** The dark theme sets `text-hover` to `baseColors.orionAlphaInverse[90]` (near-white hover text) instead of upstream's brand-tinted `brand[30]`, because the brand-tinted text lacked contrast on the dark background. Upstream's `SdkThemeProvider.unit.spec.tsx` expects dark hover text to track the brand colour, so the two dark-theme cases there (`TEAL_DARK_TEXT_HOVER`) are adjusted to expect our fixed value. If a sync conflicts in that spec, keep upstream's structure and re-apply that expectation.

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

**Conflict resolution for the theme files:** `light.ts` and `dark.ts` are the files most likely to conflict, because Teal overrides individual colour values on lines next to ones upstream keeps changing. Resolve them key by key rather than taking either side wholesale:

- **Teal overrides the key** (brand, navbar, warning, upsell, focus and hover colours): keep the Teal value. Where upstream points a key at `baseColors.blue[...]`, use the matching `baseColors.brand[...]` step instead, because `brand` follows `--mb-color-core-brand` and `blue` is Metabase's own colour.
- **Teal has no opinion on the key** (everything else, including gold, `upsell-gem`, `icon-*` and any new token): take upstream exactly. Do not revert it to the old form just because it sits beside a Teal line.
- **Check every new upstream key.** A new token built from `baseColors.blue[...]` needs a `brand` or Teal-literal equivalent. Tokens built from `brand` or the neutral `orion` scales need nothing.
- **Lint header:** Teal's hex literals require `/* eslint-disable metabase/no-color-literals */` at the top of both theme files. Upstream removes it from `light.ts` when it has no literals of its own, so re-add it if a sync drops it.
- **Verify:** `grep -n "blue\[" frontend/src/metabase/ui/colors/constants/themes/*.ts` should return nothing.

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
