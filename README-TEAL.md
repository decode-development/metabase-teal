# Metabase Teal

A custom-branded fork of [Metabase](https://github.com/metabase/metabase) (OSS edition), maintained under the terms of the [AGPL v3 license](LICENSE-AGPL.txt).

Changes are limited to branding plus one additive scheduling option (see [Functional changes](#functional-changes)). All upstream features, connectors, and APIs are preserved as-is — nothing upstream offers is removed or altered.

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

### Emails and server-rendered output

The theme files above only feed the browser. Emails, the chart images inside them, and the PDF attachment are rendered on the server, which cannot read the frontend theme — so each resolves branding through its own path. Note that `application-colors` and `application-font` are gated behind the `whitelabel` premium feature, so on an OSS build the **defaults** are the only lever.

**Brand colour.** `metabase.appearance.settings/default-application-color` is the single backend source of the teal, and `application-color` falls back to it. That one value reaches email links, section headers, minibars, the dashboard/bell icon PNG, button styles and the OAuth consent page. Keep it in sync with the `brand` key in the theme files.

**Font.** Poppins is used for email body text, rendered tables, chart labels and PDFs:

- `resources/frontend_client/app/fonts/Poppins/Poppins-{Regular,Bold,Black}.ttf` — vendored **in addition to** the `.woff2` files upstream ships. The `.woff2` files are for the browser; Java's AWT (`Font.createFont`) and PDFBox both need TrueType. Licensed OFL-1.1 (`OFL.txt` alongside).
- `src/metabase/channel/render/style.clj` — `font-style` and `register-fonts!`
- `src/metabase/channel/render/png.clj` — `wrap-non-brand-font-chars` and the body font
- `src/metabase/channel/render/pdf/font.clj` — `:brand-regular` / `:brand-bold`
- `src/metabase/channel/email/_dashsub_alert_header.hbs`, `_header.hbs` — webfont `@import` plus `font-family`
- `frontend/src/metabase/static-viz/constants/fonts.ts` — the one place static viz names the font

**Script coverage caveat.** Poppins covers Latin, Latin Extended and Devanagari, but **not** Cyrillic, Greek or Vietnamese, all of which Lato did. Those scripts now depend on fallbacks that already existed: `wrap-non-brand-font-chars` swaps the whole string to `sans-serif` for PNG rendering, and PDFBox falls back per glyph to Noto Sans. Worth checking if you add a locale.

**Chart label metrics.** Static viz renders in a headless GraalVM context and cannot measure text with a real font, so upstream ships a precomputed width table for Lato (`constants/char-sizes.ts`). Poppins is ~9% wider on average (~17% at bold), so reusing that table would under-measure every label and crowd axis margins, truncation and legend layout. We ship our own table instead:

- `frontend/src/metabase/static-viz/constants/poppins-char-widths.ts` — generated; do not hand-edit
- `dev/src/dev/static_viz_font_widths.clj` — the generator. Rerun after changing the Poppins asset:
  ```bash
  clj -M:dev -m dev.static-viz-font-widths
  ```
- `frontend/src/metabase/static-viz/lib/text.ts` prefers these widths and falls back to the Lato table per character for anything Poppins lacks.

Static viz hardcodes Poppins rather than following `application-font`, because the width table is font-specific. Upstream has the same limitation with Lato.

The PDF attachment's "Made with Metabase" badge is recoloured in `src/metabase/channel/render/pdf.clj` (`brand-svg-colors`) and `resources/fonts/pdf/metabase_logo_with_text.svg`. Its secondary tint `#ACC4C4` is the teal at the same 35%-over-white ratio that upstream's `#C2DAF0` was of its `#509EE3`, so the logo keeps its visual weight.

### Dark-mode sidebar legibility

Upstream colours the selected/hover sidebar item's text and icon with the brand colour itself. On our dark theme that is teal-on-teal (the background is a brand tint), so it fails contrast. We point the selected/hover **foreground** at the `text-selected` token (white in dark, neutral in light) while leaving the tinted background as-is. Patched in:
- `frontend/src/metabase/nav/containers/MainNavbar/SidebarItems/SidebarItems.styled.tsx`
- `frontend/src/metabase/nav/containers/MainNavbar/SidebarItems/SidebarLink.tsx`

These are shared upstream components (not isolated Teal files), so they can conflict on a sync if upstream restyles the navbar — see [Resolving a sync conflict](#resolving-a-sync-conflict).

---

## Functional changes

### Monthly subscriptions on any day of the month

Upstream's monthly schedule picker offers only three days of the month: **First**, **15th (Midpoint)**, and **Last**. We sync data and refresh dashboards on the 3rd of the month and notify clients a couple of days later, so we need to pick an arbitrary day. The picker now offers **every day from the 1st to the 28th**.

Days 29–31 are deliberately excluded: they don't occur in every month, so a subscription set to the 30th would silently skip February. Capping at 28 means a monthly subscription always fires.

**Wire format.** The existing `pulse_channel.schedule_frame` column carries a new family of values, `day-1` … `day-28`, alongside the upstream `first` / `mid` / `last`:

| `schedule_frame` | Meaning | Cron day-of-month |
|---|---|---|
| `first` | 1st, or "first \<weekday\>" when `schedule_day` is set | `1` or `<dow>#1` |
| `last` | Last day, or "last \<weekday\>" when `schedule_day` is set | `L` or `<dow>L` |
| `mid` | 15th | `15` |
| `day-5` | 5th | `5` |

`day-N` frames are mutually exclusive with `schedule_day` — a specific calendar day has no weekday — so selecting one hides the weekday dropdown, exactly as `mid` already did. The 15th keeps the `mid` value rather than gaining a duplicate `day-15`, so existing subscriptions are untouched. No database migration is needed: the column is already `varchar(32)`.

**Modified files:**
- `src/metabase/util/cron.clj` — the `schedule_frame` schema, and both directions of the cron conversion
- `src/metabase/pulse/models/pulse_channel.clj` — the valid-frame set and `valid-schedule?`
- `frontend/src/metabase/utils/schedule-frame.ts` — **new**, all of the shared frame logic
- `frontend/src/metabase-types/api/settings.ts` — `ScheduleFrameType`
- `frontend/src/metabase/common/components/SchedulePicker/SchedulePicker.tsx` — the subscription picker
- `frontend/src/metabase/utils/time-dayjs.ts` — `formatFrame`, the shared schedule label
- `frontend/src/metabase/dashboard/components/DashboardSubscriptionsSidebar/PulsesListSidebar.tsx` — the summary sentence
- `frontend/src/metabase/common/components/Schedule/{cron.ts,utils.tsx,Schedule.tsx}` — the newer picker used by question alerts and transform jobs. It deliberately does **not** offer the new days, but it now converts them to and from cron correctly instead of silently rewriting them. Its day dropdown would render blank for a `day-N` value, which is unreachable through the UI — only a hand-written cron expression could produce one.

Day labels are localized ordinals produced by dayjs' `Do` token, so they follow the user's locale. Locales whose dayjs build has no ordinal form fall back to the bare number.

> **⚠️ Before rolling back to an unpatched build**, clear the new values first:
> ```sql
> UPDATE pulse_channel SET schedule_frame = 'first' WHERE schedule_frame LIKE 'day-%';
> ```
> Unpatched code rejects `day-N` as an invalid frame while building Quartz triggers at startup, and that loop is not error-isolated — a single unrecognised row stops triggers being created for **all** dashboard subscriptions. This also applies if a sync conflict is ever resolved by dropping this commit.

---

## Versioning

This fork tracks upstream Metabase release-for-release. It uses upstream version tags directly (e.g. `v0.61.2`) — there is no independent versioning scheme. Docker images are published under the same tag, so the image version always corresponds exactly to the underlying Metabase version.

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

Only files this fork also modifies can conflict — in practice the theme files, sidebar components, and email/render files listed under [Branding](#branding), plus the scheduling files listed under [Functional changes](#functional-changes). For branding, **keep the Teal values**; the upstream values for those keys will always be wrong for this fork. For the scheduling patch, keep both sides: the change is additive, so upstream's logic should survive with the `day-N` handling layered back on top — and note the rollback warning in that section before considering dropping the commit.

Two branding conflicts need more than picking a side. If upstream changes the Lato asset paths or adds a font weight, mirror the change onto the Poppins paths in `render/style.clj` and `render/pdf/font.clj` rather than reverting them. And if upstream regenerates `char-sizes.ts` or changes how `lib/text.ts` measures, re-run the width-table generator afterwards — a stale table shows up as crowded or clipped chart labels in emails, not as a test failure.

The next daily run (or a re-run) goes green once `<TAG>` is on `master`.

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
