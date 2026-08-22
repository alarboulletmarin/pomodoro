# Pomodoro

[![Licence : AGPL-3.0-only](https://img.shields.io/badge/licence-AGPL--3.0--only-blue.svg)](LICENSE)

> A work timer that lets you leave.

No notifications. No streak to protect. No badge, no nagging sound, nothing to do
here once your session is over. While a session runs, the screen collapses to the
digits, the progress bar and two buttons — it has nothing to offer you until you
come back.

Everything stays on your device. It installs, and it works with the network off.

![Setting the length by dragging the digits, then a session starting](design/social/pomodoro-demo.gif)

The length is set by **dragging the digits** — nine pixels a minute, with the next value
above and the previous one below so it reads as a dial rather than a field. Arrow keys,
`Page↑`/`Page↓`, `Home`/`End` and the wheel do the same thing, and the three presets are
there for the lengths people actually pick.

The first visit opens on a screen that says what the app is, in the language the
browser asks for, and never shows it again — a link sent to someone lands on an
explanation rather than on a bare clock. `?intro` brings it back on a device that
has already seen it.

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
| `icons`                       | redraw the icon set and favicon   |
| `social`                      | re-render the share images        |
| `demo`                        | re-record the demo GIF and videos |
| `film`                        | re-cut the promo film             |
| `format`                      | Prettier                          |

`SITE_URL=https://your.host npm run build` writes absolute URLs into the link
preview tags. Without it they stay relative, which most unfurlers still resolve.

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

Two typefaces, two jobs. Clash Display is drawn for large sizes: it carries the
clock, the screen titles, the wordmark and the labels on committing actions — short
strings, never under 14px. Inter carries everything read as a sentence or scanned as
a list: body copy, hints, list rows, values, the stats card end to end. One display
face doing both jobs is what the app shipped with, and at 13px its tight spacing and
closed apertures cost more than its character was worth. `--font-display` and
`--font-sans` hold the two; a module that needs the first says so, everything else
inherits the second.

Inter is one variable woff2, subset to the characters the interface uses and to the
400–600 weights it asks for: 25 KB. Clash lost the 400 weight nothing calls for any
more, so the type payload is 42 KB across three files, up from 24 KB.

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

## Getting the new version

An installed app runs from its own copy of the files, which is what makes it work
with the network off — and what makes a deploy invisible until something replaces
that copy. On a phone there is no reload button and no obvious way to clear it.

So the service worker is registered in `prompt` mode: a new version installs and
then waits. Nothing is swapped under a session in progress. When one is ready, a
quiet notice offers the reload — never over a running session, never on top of the
settings, which carry the same button. The settings also hold the check itself:
`version 0.1.0` with a button that asks the server, and answers `à jour` when there
is nothing. That row is the reload button that a phone does not otherwise have.

The app also asks by itself: every hour it is left open, and whenever it comes back
on screen after fifteen minutes away — an installed app can sit for days otherwise,
and would never learn that anything shipped.

One trap, found by shipping two builds against a running instance and watching:
`updateServiceWorker(true)` promises to reload the page and does not, when that page
was already controlled by a worker. The new worker takes over, the screen keeps the
old bundle, and the reload button appears to do nothing. The reload is therefore
done here, on `controllerchange`, with a timeout for the worker that never announces
itself.

## The mark

One dial, two runs: the long one is the 25-minute session, the short one the 5-minute
break, on a turn of 30. The ratio is the rhythm the app arms on launch — the drawing
says what the product does, without a caption and without a tomato. It stands next to
the name, which stays set in Clash Display.

`scripts/mark.mjs` holds the geometry and is the only place it exists. `npm run icons`
redraws every PNG and the favicon from it; `src/shared/ui/Mark.tsx` carries the two
path strings that script prints, and the app draws them in `currentColor` beside the
wordmark in the shell header and on the intro card. Change the ratio in one file and
every surface follows.

That file also restates the accent and surface palettes, because a `.mjs` script cannot
import TypeScript. Restated values drift, so `Mark.test.tsx` reads the generator, the
favicon and the share boards off disk and fails the build when any of them stops
agreeing with `ACCENT_PALETTE`, the theme colours or the two paths.

The icons are rasterised by hand and encoded with `zlib` — no image dependency for a
rounded square and two arcs. Three drawings, because three purposes want different
things, and shipping one file under two of them is what left the installed app looking
wrong:

- **`any`** (192, 512, plus a 32 for the tab) keeps its rounded corners transparent.
- **`maskable`** (512) bleeds the tile to all four edges and pulls the dial inside the
  80% safe circle, so a launcher's round or squircle mask crops background, not mark.
- **`monochrome`** (512) is alpha only, for the Android launchers that tint it.
- **`apple-touch-icon`** (180) is square and fully opaque: iOS does not composite what
  you hand it, so a transparent corner arrives black.

## The link, and what gets posted

A pasted link has to explain itself before anyone taps it, so `index.html` carries Open
Graph and Twitter card tags and `public/og.png` is the 1200×630 card they point at.
Beside it, `design/social/` holds the posting formats — 1920×1080 and 1080×1920 — in
every theme and every shipped accent, twelve files named
`pomodoro-<format>-<theme>-<accent>.png`. They stay out of `public/` on purpose: they
are images to post, not files the app should carry into every offline install.

There is only one `og.png` because `index.html` names it, and it is the light theme in
red — what someone who has changed nothing is looking at. `npm run social` redraws the
lot; `npm run social -- --accent '#7A5AF8'` swaps the three shipped accents for a colour
of your own, in both themes, the way the settings let anyone pick one.

Every format is a board in `design/social/cards.html`, captured by `npm run social`. One
file, so they are judged side by side; separate templates drift. Each board sets a font
size and everything on it is expressed in `em` of that, so a format is recomposed by
changing one number and nothing can slip under the legibility floor by accident. The
theme and the accent arrive from outside, through the same custom properties the app
uses, at the same values.

The clock and the bar describe one instant, and the board derives the second from the
first — fill is elapsed, digits are remaining, as in the app. The first version showed
`25:00` above a bar already a third of the way across: a picture of something that never
happens.

## The film

`npm run film` cuts a thirty-second promotional film, in 16:9 and 9:16. It is an edit,
not a capture, and it opens mid-gesture: a hand already dragging the digits, because
what stops a thumb is a number moving, not a logo being drawn. Then the promise lands on
its own card, the session starts and the screen empties, a card says `Rien ne sort de
ton appareil.`, the theme and the accent change on screen, a dark card lists what the
app refuses to do, and the mark finally draws itself on the end card over a button
reading `installe-le depuis ton navigateur`. The lockup is the signature, not the
greeting — at the head it means nothing to anyone.

The beats are 2.5 to 5.8 seconds, on purpose. A film where every shot lasts the same
four seconds has no rhythm, and the eye leaves before the argument does.

It is built in three passes. **Shooting**: Playwright plays each shot in the real app,
one browser context per shot so every clip starts and ends where the edit wants it.
**Cutting**: `design/film/film.html` holds the edit; the take frames are served into it
one at a time and `render(t)` samples the animations at the second it wants rather than
letting them play. **Encoding**: frames go down a pipe into ffmpeg without touching
disk — thirty seconds of 1920×1080 is nine hundred files nobody needs.

Sampling rather than playing is what makes it reproducible to the frame. Real CSS
keyframes are still what the edit is written in; each shot carries `--local`, the time
since it came in, and every animated element resolves
`animation-delay: calc((var(--delay) - var(--local)) * 1s)` against it, paused. A
negative delay samples an animation at exactly that instant.

**Shots overlap, and the overlap is the dissolve.** Each scene's exit lasts exactly as
long as the next one takes to arrive, computed at load from the two bounds rather than
written down: a hand-written exit duration is wrong the first time a cut moves. Cards
leave upward, in the direction the next one arrives from; a filmed shot and a coloured
ground only fade, since either of them sliding would show the paper behind it. A card's
ground fades in too — dropped in at full strength it cuts hard exactly where everything
else overlaps.

**Each shot is framed rather than dropped in flat.** `--ox`/`--oy` name the point it
holds on, in the coordinates of the take, and it drifts between two scales for its whole
length: the gesture tightens on the dial and pushes the stats rail out of frame, the
session opens up as the screen empties. In 9:16 that movement is nearly nothing. The app
already fills the width of its screen there, so past about 3% the frame cuts its flanks,
and the take is filmed 540px wide and already doubled — the format is given its own
composition instead, a taller caption band with the caption ranged to its top, away from
the account name and the buttons a story is read under.

**The caption lives in a band of paper below the picture, not on it.** The first version
was a white slab across the bottom sixth of the frame that landed exactly on the button
being watched.

The one measurement that has to be right is the trim. The recorder starts with the page,
so the first second of every clip is a page loading; the shooter timestamps the moment
the app is ready and cuts that much, rather than guessing a constant, and `HOLD_SEC` of
a motionless app absorbs what is left. None of that is film, so none of it is shown:
each scene says with `data-head` which second of its take it opens on, and every take
runs a second longer than it needs at both ends so the edit can enter mid-gesture and
leave after it.

The poster frame — what a player shows before anyone presses play — is the dial in
mid-drag with its caption, not the promise alone on paper. A sentence on an empty ground
says half of what a still has to say.

## The demo

No still frame can show the one gesture the app is built around, so `npm run demo`
films it: Playwright drives the **real build** — not a re-enactment — through the whole
move. Grab the digits, climb to 45 minutes, come back down, let go, start, and watch the
screen collapse to what a running session needs.

Both it and the film need a server on `http://localhost:4173`
(`npm run build && npm run preview`, or set `POMODORO_BASE_URL`) and **ffmpeg on
`PATH`**; `scripts/stage.mjs` holds what they share — the browser opened on a known
state, the drawn cursor, the eased gestures. Out of `npm run demo` come
`design/social/pomodoro-demo.gif` for a README or a chat, and
`pomodoro-demo-16x9.mp4` / `pomodoro-demo-9x16.mp4` for the networks, which almost all
refuse WebM.

Three things the recording has to do that are not obvious:

- **Draw its own cursor.** A capture does not record the system pointer, and digits that
  change with nothing touching them do not read as a gesture. A dot is injected into the
  page and tightens on press.
- **Seed a month of sessions.** An empty record would leave half the desktop screen
  blank, and the record is exactly what the app has to show. The seed is computed, not
  drawn at random, so two takes give the same week.
- **Pick the window for the layout, not the resolution.** Past 768px the app switches to
  its tablet layout, so the 9:16 has to be filmed at 540 wide and enlarged afterwards —
  Playwright composes video in CSS pixels and only ever scales _down_, so asking a 540px
  window for a 1080px video returns grey borders, not a bigger picture.

The card is laid out for the size it is actually seen at. A chat client draws it around
350px wide, so everything on it is sized against that: the sentence is the largest
element and set in the text face, and nothing is smaller than 27px on the 1200px canvas
— under about 30px it arrives illegible. Check any change to it by looking at the PNG at
350px, not at full size. The 9:16 is read at arm's length for a couple of seconds, so it
takes the opposite treatment: the lockup becomes a sign, the claims stack instead of
running as one punctuated line, and the white that remains is white on purpose.

## Verified

257 unit tests, 8 end-to-end, on Chromium.

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

**The intro is a screen, not a tour.** No tooltips, no dots, no swiping through
steps: one card, three sentences, one button. A tour would be four decisions in a
row before the app does anything, on a first visit that lasts seconds. What the
card leaves out — the presets, the stats, the settings — is discoverable in place,
and the method page carries the rest.

**Only tested on Chromium.** WebKit's Linux build needs system packages that were
not installed, so the matrix, the offline proof, the drift test and Lighthouse all
ran on Chromium. For an app whose main install target is iOS Safari, the
Safari-specific risks — `100dvh`, `env(safe-area-inset-*)`, wake lock, `color-mix`,
service-worker eviction — are untested.

## Design

`design/` holds the high-fidelity mockups the build was made from. They are the
visual and behavioural reference; their code is a mockup runtime and was not
ported. `design/social/` is the exception: it is not a mockup but the source of the
three images the project ships, and it is regenerated, not read.

The version log is in [`CHANGELOG.md`](CHANGELOG.md).

## Licence

**AGPL-3.0-only**, see [LICENSE](LICENSE). Copyright (c) 2026 Andréa Larboullet Marin.

Strong copyleft. In plain terms:

- **Using it, installing it, hosting it, modifying it for yourself: freely**, including
  commercially. The licence discriminates against no use.
- **Redistributing it, or hosting a modified version for other people: you publish your
  modified sources under AGPL-3.0.** Article 13 asks for that even when the software is
  only reachable over a network — and it is exactly the case here, since serving this
  app is handing its code to a browser.
- **Folding it into a closed product: no**, absent a separate agreement with the author.

The point is not to stop anyone earning a living with it. It is to stop anyone closing
it. What leaves here stays open.

That covers this repository. The two typefaces keep their own terms: Inter's licence
ships beside its woff2 in [`public/fonts/inter-LICENSE.txt`](public/fonts/inter-LICENSE.txt),
and Clash Display's does not yet — it is bundled without its notice, which is a gap to
close before anything is published. `react` and `react-dom`, the only two runtime
dependencies, are MIT.
