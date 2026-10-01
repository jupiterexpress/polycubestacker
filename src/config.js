/* =====================================================================
   CFG — every value is a tunable placeholder. Nothing here is a final rule.
   ===================================================================== */
export const CFG = {
  seed: 0,                                  // 0 = new random seed each build; set a number to repeat a sequence
  baseplate: { w: 5, d: 5 },                // starting construction area in cells (not a boundary)
  piece: { minCells: 3, maxCells: 4, spawnFlat: true },   // random polycube size range; spawnFlat = arrive in the flattest resting position
  move: {
    pattern: 'alternate',                   // 'alternate' | 'x' | 'z' — travel axis per piece
    speed: 2.6,                             // cells per second
    margin: 1,                              // how far past the built edge of its line the piece travels (cells)
    hoverGap: 2.5,                          // cells between the top of the structure and the hovering piece
    rampTo: 1.5,                            // speed multiplier reached on the last piece of a run (1 = no ramp)
  },
  turn: {                                   // the AXIS button: change travel axis mid-flight
    maxPerPiece: 0,                         // 0 = unlimited axis changes per piece
    meterCost: 0,                           // Power Meter points spent per change (0 = free)
  },
  run: { pieces: 30 },                      // pieces per build; the run ends when they are used
  strikes: {
    limit: 3,                               // run ends when strikes reach this (0 = off)
    miss: true,                             // piece landed on nothing
    allTrimmed: true,                       // every cube was outside the baseplate
    topple: false,                          // piece rolled off (intended for harder difficulties later)
  },
  guides: { pathLine: false },              // floating line along the travel path (lane highlight is always on)
  buildArea: {
    trim: true,                             // cubes outside the baseplate footprint are cut off after landing
    pause: 0.2,                             // seconds the landed piece holds before the cut (the learning beat)
    slice: 0.1,                             // seconds for the light to sweep along the edge (overlaps the tip)
    tip: 0.15,                              // seconds for cut cubes to hinge over the edge
    fall: 0.25,                             // seconds for cut cubes to fall and shrink away
  },
  rotate: { animMs: 140, allowTip: true },  // FLIP = roll 90° about a horizontal axis (away from the camera)
  physics: {
    gravity: 42,                            // cells/s² for the drop
    dropKick: 6,                            // initial downward speed on Place
    tolerance: 0,                           // stability slack in cells (+ = more forgiving)
    toppleAccel: 10,                        // how fast an unstable piece rolls off
  },
  perfect: { minSupport: 1 },               // share of a piece's underside that must rest on something (1 = all of it)
  celebrate: { flash: 0.1, spark: 0.15, pop: 0.15 },  // meter-full payoff, seconds per phase
  meter: {
    max: 4,                                 // points to fill (easy-level placeholder)
    success: 0,                             // points for a stable placement that isn't perfect
    perfect: 1,                             // points for a perfect placement
    reward: 'shadow',                       // powerup granted when full
  },
  powerups: {
    shadow: { placements: 3, showStability: false },   // Landing Shadow covers this many drops
  },
  camera: {
    yaw: 0.72, pitch: 0.52, dist: 14,
    pitchMin: 0.14, pitchMax: 1.12,         // radians — keeps the view from flipping and from looking straight down
    sens: 0.0075, settle: 0.06,             // seconds the view takes to settle after a drag (no glide)
    zoomMin: 0.75, zoomMax: 1.25,              // pinch-zoom range around the automatic distance (about 25% either way)
    ring: 0.6,                               // camera fit: share of the area pieces can travel that must stay on screen (0 = off; lower = closer)
  },
  spawnDelay: 0.25,                         // seconds before the next piece appears
};

export const PALETTE = [0xd9a441, 0x3f8f8a, 0xc0583e, 0x4f6fae, 0x87a35f, 0xcfc4ae];
