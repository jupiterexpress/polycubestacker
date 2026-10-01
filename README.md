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

Builds the game and checks two things:

- **Gameplay is unchanged.** It replays 14 seeded, scripted runs (263 drops, covering trims, strikes, the Power Meter and Landing Shadow) and compares every drop to `tests/golden.json`, which was recorded from the original single-file prototype (`legacy/stacker-prototype.html`).
- **It works offline.** The page loads with all internet access blocked.

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
