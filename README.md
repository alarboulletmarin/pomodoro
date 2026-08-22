# Pomodoro

A work timer that lets you leave.

No notifications. No streak to protect. No badge, no nagging sound, nothing to do
here once your session is over. While a session runs, the screen collapses to the
digits, the progress bar and two buttons — it has nothing to offer you until you
come back.

Everything stays on your device. It installs, and it works with the network off.

## Running it

```
npm ci
npm run dev
```

| Script                        |                                   |
| ----------------------------- | --------------------------------- |
| `dev`                         | Vite dev server                   |
| `build`                       | typecheck, then production build  |
| `preview`                     | serve the production build        |
| `lint` · `typecheck` · `test` | the checks CI runs                |
| `e2e`                         | Playwright, the two user journeys |
| `format`                      | Prettier                          |

## How it is put together

```
src/
  domain/        pure, React-free, 100% covered — the state machine, the
                 duration maths, storage and the derived statistics
  features/      timer · stats · settings, one component per file + its CSS module
  shared/        i18n, theme, settings, hooks, UI primitives
  app/           the shell: composes the three surfaces per layout
  types/         every contract that crosses a module boundary
  styles/        design tokens, reset
```

Business logic never imports React — an ESLint rule enforces it. Time-dependent
functions take `now` as an argument, so the tests need no fake timers and cannot
flake.

The timer derives its remaining time from an `endsAt` timestamp rather than
decrementing a counter, and resynchronises on `visibilitychange`, `focus` and
`pageshow`. A session left in a backgrounded tab for 25 minutes lands exactly on
zero, and one that ran to term while the app was closed is settled and logged on
the next launch. A session is only ever written at its term.

React 18, TypeScript strict, CSS Modules and custom properties. `react` and
`react-dom` are the only runtime dependencies — no CSS framework, no state
library, no i18n library, no chart library.

Four layouts (portrait, landscape, tablet, desktop), three theme settings, four
accents, French and English, all persisted and applied without a reload. `system`
is the default theme and tracks `prefers-color-scheme` live — the app turns with
the device, mid-session, without a reload.

The lengths and the daily goal are settings, not constants: the focus session
(5–90 min), the break (1–30 min) and the goal (1–12 sessions) decide what the app
arms on launch, what it offers when a session ends, and how many dots the stats
draw. The timer screen still overrides the current session without touching them.

The stats read out a day at a time. Every week bar carries its count, and every
bar and heatmap cell is a button: picking one states that day's date, sessions and
total focus time under the charts; picking it again goes back to today.

## Verified

237 unit tests, 4 end-to-end, on Chromium.

The figures below were measured on the build that preceded the settings and stats
work, and have **not** been re-run since. Lighthouse on the production build:
Performance 100 desktop / 99 mobile, Best practices 100. Installable —
`getInstallabilityErrors` returns empty, service worker active, manifest clean.
Offline was checked by killing the server and reloading, deep link included.
Across 224 rendered states (4 layouts × 2 themes × 4 accents × 2 languages ×
{timer, settings} × {idle, running}): no overflow, 2040 interactive elements
enumerated with none under 44×44px, and no visible text below its contrast
threshold. That last count no longer holds — see the deviation below.

## Known deviations

**Lighthouse Accessibility is 96, not 100.** The ghost ±1 min values above and
below the clock sit at 16% opacity, as specified — they exist to signal that the
digits scroll. axe flags them at 1.54:1, and it ignores `aria-hidden` because a
sighted user still sees them. Clearing 3:1 would take roughly 50% opacity, at
which point three near-equal rows of digits compete and the real value is harder
to pick out. The design won; the score is the cost. Deliberate.

**Two light accents were darkened.** The specified `#F0464E` and `#2E8B62` put
white text at 3.69:1 and 4.21:1 — below the contrast floor. Green could not be
fixed by foreground colour alone (4.36:1 at best against anything). They are now
`#D63E45` and `#2C855E`, at 4.53:1 and 4.54:1, an 11% and 4% shift in brightness.
A unit test asserts the invariant, so an accent that fails cannot land silently.

**The heatmap ramp and the week bars stay below 3:1 as graphics.** The four-step
opacity ramp is specified; raising it would rewrite the chart's visual weight.
Every cell and bar carries an accessible label, and the footers restate the
totals, so nothing is available only to a sighted user — but the levels are
distinguished visually by colour, and the low steps are faint by design.

**The stats targets are under 44px wide.** Making a day selectable makes each week
bar and each heatmap cell a button, and seven of them share the width of the card:
in portrait a bar is roughly 38×90px and a cell roughly 38×22px. Widening them
would mean scrolling the week or dropping days from the grid, and the readout they
feed is the point of the change. The bars clear 44px in one dimension; the cells
clear it in neither. Every day of the current week is reachable from the taller
bars, and every cell states its date and its count to a screen reader.

**Only tested on Chromium.** WebKit's Linux build needs system packages that were
not installed, so the matrix, the offline proof, the drift test and Lighthouse all
ran on Chromium. For an app whose main install target is iOS Safari, the
Safari-specific risks — `100dvh`, `env(safe-area-inset-*)`, wake lock, `color-mix`,
service-worker eviction — are untested.

## Design

`design/` holds the high-fidelity mockups the build was made from. They are the
visual and behavioural reference; their code is a mockup runtime and was not
ported.
