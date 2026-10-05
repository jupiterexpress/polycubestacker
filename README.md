# Polycube Stacker

A mobile 3D stacking game. Random polycube tiles travel back and forth over a build; you ROTATE, FLIP, change AXIS and DROP them so they settle onto the structure. Built with Three.js, bundled with Vite, and wrapped as an iPhone app with Capacitor. Everything runs offline.

Design decisions and the reasons behind them are in [DESIGN.md](DESIGN.md). Read it before changing gameplay.

## Setup (once per machine)

1. Install Node.js 20 or newer (from nodejs.org, or `brew install node`).
2. In this folder: `npm install`
3. For the iPhone app: Xcode from the Mac App Store.
4. For the tests: `npx playwright install chromium`

## Play in a browser

```
npm run dev
```

Open the local address it prints. The "Network" address works on a phone on the same Wi-Fi.

Open the server URL, rather than opening `index.html` directly: Vite loads and bundles the game’s modules, styles, and fonts.

## Asterra opening and first contract

First-time players create a named geometric contractor, meet the city, witness a brief stylized earthquake, and learn about rebuilding, blueprints, density, and rewards. Nine player-paced pages take roughly 30–45 seconds to read; Continue or tapping the scene advances immediately. Reduced-motion settings remove the shake and animated collapse.

The story leads to four looping control demonstrations, then the guided placement challenge. Hints appear only after the player has had time to experiment. Completing practice opens the Lantern House contract: fill a 5 × 5 × 3 blueprint to at least 60% density using up to 30 tiles. The glowing outline and density HUD show the goal during play. Cells above the blueprint do not earn density credit.

End-of-contract coins reward filled blueprint cells with an additional density bonus. An amber-window upgrade costs 20 coins and decorates the current build. The name, completed onboarding, and coin balance save locally; structures are currently per-run. Pause → **MEET ASTERRA** replays the story; **HOW TO PLAY** replays training. Returning players see the contract briefing.

## Run on your iPhone

```
npm run ios
```

This builds the game, copies it into the iOS project and opens Xcode. Then in Xcode:

1. Select the **App** project in the left sidebar, then the **App** target, then **Signing & Capabilities**, and choose your **Team** (sign in with your Apple ID if asked). A free Apple ID can install on your own phone for 7 days at a time; the paid Apple Developer Program is needed for TestFlight and the App Store.
2. Plug in your iPhone, pick it at the top of the Xcode window, and press **Run** (▶).
3. First time only, on the iPhone: turn on **Settings → Privacy & Security → Developer Mode**, and if asked, trust your developer certificate under **Settings → General → VPN & Device Management**.

After changing the game code, run `npm run ios` again (or `npm run sync` if Xcode is already open) before pressing Run.

The app ID is `com.jupiterexpress.polycubestacker` (in `capacitor.config.json`). Change it before the first TestFlight upload if you want a different one; it can't change after the app is on the App Store. The app icon is still Capacitor's placeholder.

## Test

```
npm test
```

Builds the game and checks:

- **Gameplay is unchanged.** It replays 14 seeded, scripted runs (263 drops, covering trims, strikes, the Power Meter and Landing Shadow) and compares every drop to `tests/golden.json`, which was recorded from the original single-file prototype (`legacy/stacker-prototype.html`).
- **It works offline.** The page loads with all internet access blocked.
- **Onboarding and contracts work.** Name validation, story progression, storage fallback, reduced motion, tutorial hints and completion, contract density, coin rewards, and customization.

If you change gameplay on purpose, the first check will fail. Re-record the reference with:

```
UPDATE_GOLDEN=1 npx playwright test
```

then commit the new `tests/golden.json` alongside the change.

## Where things are

| File | What it holds |
|---|---|
| `src/config.js` | Every tunable number (all placeholders), plus the tile colors |
| `src/main.js` | Startup, the animation loop, and the `window.STACKER` debug handle |
| `src/opening.js` | Contractor creation, story chapters, saved onboarding, tutorial handoff |
| `src/opening-scene.js` | Procedural city, floating contractor, earthquake, blueprint illustration |
| `src/tutorial.js` | Guided placement challenge and contextual hints |
| `src/contract.js` | Lantern House blueprint, density, saved coins, amber-light upgrade |
| `src/game.js` | Spawning, ROTATE / FLIP / AXIS / DROP, trimming, landing, scoring, strikes, reset |
| `src/state.js` | The current run's state (`S`) |
| `src/poly.js` | Tile shapes, the 24 orientations, resting sides for FLIP |
| `src/world.js` | Which cells are filled, the baseplate area and trimming geometry |
| `src/physics.js` | Where a tile lands and whether it stays (center of mass over support) |
| `src/movement.js` | How tiles travel along their lane |
| `src/camera.js` | Camera angle, distance and drag/pinch input |
| `src/scene.js` | Renderer, lights, shadows, cube meshes, baseplate |
| `src/guides.js` | Lane highlight, optional path line, Landing Shadow ghost |
| `src/fx.js` | Short visual effects (dust rings, flashes, trim sweep) |
| `src/ui.js` | HUD, buttons, pause, tuning sheet, end card, meter-full animation |
| `src/audio.js` | Synthesized sound effects |
| `src/powerups.js` | Powerup registry (Landing Shadow) |
| `src/styles.css` | All styling |
| `ios/` | The Xcode project (Capacitor) |

The tuning sheet (slider icon, top right) changes most values live. It is a development tool and should be hidden or removed for release builds.
