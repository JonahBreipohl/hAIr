# CI accessibility reflow repair

Date: 2026-10-06. Scope: deterministic fake-provider consultation UI and browser
regression checks. No live portrait, provider, retention, or release-policy change.

## Failure evidence

Both initial `main` pushes installed dependencies, passed repository safety,
TypeScript, lint, all 501 unit/integration tests, and the production build. Their
browser checks passed 72 cases and failed the same 320 CSS pixel / 200% text
reflow case in all four profiles, including retries:

- [Initial prototype run](https://github.com/JonahBreipohl/hAIr/actions/runs/37271115493)
- [Publication documentation run](https://github.com/JonahBreipohl/hAIr/actions/runs/37271216603)

The failure occurred after selecting collarbone layers on the describe screen.
Local Windows Chromium passed the old document-width assertion with its default
font while the current-brief panel still overflowed internally: scroll width 274
pixels inside a 256-pixel panel. A wider Verdana font reproduced document overflow
at 350 pixels in a 320-pixel viewport. This identifies a font-sensitive wrapping
defect; the exact Linux glyph measurements were not recovered from the old logs.

## Repair and regression coverage

- Allow current-brief text and top-level headings to wrap long words.
- Bound button widths, allow grid items to shrink, and wrap button text.
- Preserve enlarged typography, native form controls, and horizontal-overflow
  assertions; do not hide page overflow.
- Run the 320-pixel / 200% regression with application and monospace fonts in
  desktop Chromium, iPhone WebKit, Pixel Chromium, and Galaxy Tab Chromium.
- Check local brief/button overflow, two supported cuts including the longest
  option, capture, comparison, stylist agreement, simulated sharing, deletion
  confirmation, and the deleted state.

The expanded regression also exposed a direct deletion-dialog heading overflowing
its container. The heading wrapping repair addresses that defect.

## Verification

- `pnpm install --frozen-lockfile`: passed using pnpm 10.33.2; installed workspace
  was already up to date. This is not a fresh local installation.
- `pnpm typecheck`, `pnpm lint`, `pnpm check:safety`, `pnpm build`: passed.
- `pnpm test`: 501 tests passed in 20 files.
- Targeted development-server regression: eight cases passed across four profiles.
- Full production-server browser suite: 80 cases passed across four profiles,
  using `pnpm --filter @hair/web start` and `pnpm test:e2e --workers 4`.
- Independent review: no material P1/P2 findings. A separate Chromium check at
  320 x 568 pixels / 200% text / monospace completed the synthetic flow through
  sharing and deletion, verified reachable actions, and retained document width
  320 with no local completion-button overflow.
- [GitHub Linux Verify run 37580739134](https://github.com/JonahBreipohl/hAIr/actions/runs/37580739134):
  passed on repair commit `af83582ae464b4dc63842a498838721f485145ca`.
  Frozen-lockfile installation, safety, TypeScript, lint, all 501 unit/integration
  tests, production build, and all 80 development-server browser checks passed.
  No flaky or retried-test summary was reported. The earlier failures remain
  historical evidence and are superseded by this passing repair run.

Physical devices, assistive technology, live image quality, participant research,
and pilot-release evidence remain separate outstanding gates.
