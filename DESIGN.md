# Design notes

These are decisions made while building the prototype, with the reason for each. Many came from playtesting. Before changing one of these behaviors, read why it is the way it is.

Every number lives in `src/config.js` and is a placeholder to tune, not a final rule.

## Scope so far

The prototype is the core stacking interaction only. Not built yet: blueprints and levels, a tutorial, a speed-building mode, density grading, coins, cosmetics and monetization.

## Controls

- **ROTATE ↻** spins the tile 90° about the vertical. It sets which way the tile faces and is the main aiming control.
- **FLIP** steps through the tile's *resting sides* (which way is down, ignoring spins) in a fixed order for that shape, flattest first. Flat is always one tap away, and the result never depends on the camera, the lane or the direction of travel. FLIP keeps the facing as close as possible to before, so it shouldn't need a ROTATE to undo it.
  - Why: the original FLIP rolled the tile away from the camera, so the same tap did different things depending on the view, and making a tile flat took a different sequence each time. Rolling toward the travel direction reverses on every bounce. Rolling toward a fixed end of the lane still makes players solve 3D rotations mentally under time pressure. Swiping on the tile conflicts with drag-to-move-the-camera.
- **AXIS** switches the tile's travel direction 90° at its current position; it keeps moving from where it is. Unlimited by default.
- **DROP ↓** snaps to the nearest cell and drops straight down.
- Button names went ROTATE/TIP/TURN/PLACE → SPIN/FLIP/SWITCH/DROP → ROTATE/FLIP/AXIS/DROP. ROTATE vs TURN read as the same thing; TIP read as "hint". Left pair = the tile's orientation, right pair = where and when it lands. In code, AXIS is still called `turn` and FLIP `tip`.
- Tiles arrive lying flat in a random facing (`piece.spawnFlat`; off is intended for harder levels).
- Never say "orbit" to players. Camera instructions say "Drag to change camera angle".

## Movement and guides

- A tile travels along one row or column ("lane"). New lanes are picked only from rows that have something built in them, weighted by how much, so tiles don't spawn over empty air.
- Travel reaches 1 square past the built edge (was 2). Overshooting the plate is allowed so players can make mistakes; 1 square keeps the camera closer.
- The **lane highlight** lights the top faces of every row the tile's footprint covers, across its whole travel range. It shows where the tile travels, not where it lands.
- A floating **path line** exists but is off by default; the full-width highlight replaced it.
- **Speed ramp:** linear by piece number, 1× → 1.5× on the last piece. Capped low because DROP snaps to a cell, and at ~2× the tap window per cell (~0.2 s) turns it into a reflex test. Tied to piece number, not height, so the curve is the same every run.

## Lighting and shadows

- An angled light shades the blocks (lit tops, darker sides) but casts **no** shadow. A straight-down light casts **all** shadows, so a hovering tile's shadow sits directly under it, inside the lane highlight. Both cues must point at the same squares.
- Shadows come from invisible full-width "caster" boxes, not the visible cubes (which are slightly undersized so their edges read). That makes a tile's shadow one solid shape with crisp edges and no seam lines. Blurring was rejected: it smears the edges that show which squares the tile is over.
- Only the plate and blocks receive shadows. The ground and pillar don't, so the part of a tile hanging past the plate casts nothing — no shadow means no support.

## Landing, physics and trimming

- A tile lands on the highest filled cell under any of its cubes. It stays if its center of mass is over the area it rests on; otherwise it rolls off. Placed blocks are rigid.
- The **baseplate is the build area** and never blocks a drop. Cubes past the edge are trimmed **after** the tile lands, so players see where it was going:
  - The tile lands intact, holds 0.2 s (the minimum to see what stuck out), a light sweeps along the edge, the overhanging cubes hinge over the edge (0.15 s) and fall and shrink (0.25 s). About 0.6 s total.
  - No red or warning colors; red was too alarming.
  - Non-blocking: the next tile arrives on schedule. A DROP pressed mid-trim waits until the trim finishes.
  - A tile entirely off the plate stops at plate level past the edge for the same hold, then falls.

## Perfect placements and the Power Meter

- **Perfect** = every cube's underside rests on something and nothing was trimmed.
- **Only perfects fill the meter**, +1 each; 4 fill it (easy-level placeholder). Partly trimmed or overhanging placements earn nothing.
- Landing callouts are one word: "PERFECT +1", "TRIMMED" or "PLACED". No counts.
- **Meter-full payoff**, 0.4 s, never pauses play: the meter flashes (0.1 s), a spark flies to the Landing Shadow button (0.15 s), the button pops with a chime (0.15 s), then the meter shows empty. Without it, a meter emptying on payout read as a reset.
- Watch item: a test bot got perfects on about 1 in 5 drops. If real players earn a Shadow only about once per run, loosen `perfect.minSupport` rather than lowering the meter size.

## Landing Shadow (powerup)

- Earned from the meter, tapped to activate, covers 3 drops.
- Shows the cubes that will stay as a see-through ghost where they'll rest, and cubes that will be trimmed as a dashed outline.
- A timer mode was tried and removed: it punished thinking (when the Shadow is most useful) and its value drifted with the speed ramp.
- More aiming powerups are planned.

## Strikes and run structure

- A run is 30 pieces. A **strike** is a piece that adds nothing: it landed on nothing, or every cube was trimmed. Topples are not strikes yet (they happen too easily); intended for harder levels.
- 3 strikes, counted across the run, end it with "OUT OF STRIKES"; using every piece ends with "BUILD COMPLETE". A known final strike ends the run immediately instead of spawning one more tile.
- The end card shows placed, fell, strikes, height, footprint and compactness. Compactness is misleading (a one-wide tower scores 100%) and should be replaced when density grading is designed.

## Camera

- One-finger drag changes the angle; the view follows the finger and settles in 0.06 s, with **no momentum or glide**.
- The camera's distance is **one value for every angle**, the worst case needed to keep the build and the tiles' travel area on screen. Dragging only rotates; nothing zooms in or out under your finger. The distance only changes, gently, as the build grows.
- History: framing the current tile's path made the camera zoom in on every drop and back out on every new tile; an angle-dependent distance made it drift after a drag. Both were removed.
- Tilt is capped short of straight down. Top-down views turn the game into a flat puzzle and remove the building feel; keep this in mind for blueprints (show targets as 3D silhouettes, not flat outlines).
- Pinch / trackpad zoom is limited to about 25% either side of the automatic distance.

## Pause

- Pause freezes everything, including trims and timers. Resume, Restart, Tuning. Auto-pauses when the app or tab goes to the background. The camera can still be moved while paused, to inspect the build.

## Known issues

- On a narrow phone, the stats line can be wider than the screen and get cut off at the right.
- Topples can feel arbitrary; a short teeter before falling, or slightly more forgiving stability, has been suggested.
