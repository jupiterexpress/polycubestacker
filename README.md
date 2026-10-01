# Polycube Stacker

Playable mobile 3D stacking prototype (single file, Three.js r128 from cdnjs).

Open `index.html` in a browser; no build step.

- Random polycubes travel back and forth over the build; ROTATE, FLIP, AXIS (change travel direction), DROP.
- Pieces settle onto the structure; cubes landing outside the baseplate are trimmed after landing.
- Perfect placements (full underside supported, nothing trimmed) fill a 4-point Power Meter that grants Landing Shadow for 3 drops.
- 30-piece runs, 3 strikes (missed or fully trimmed pieces), speed ramps to 1.5× by the last piece.
- Pause, and a tuning panel (slider icon) exposing every number; all values are placeholders in the `CFG` block.
