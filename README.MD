What I'm Trying to Accomplish

To build a quiet, exploration-first game where the core challenge is navigation and orientation, not combat, progression trees, or UI guidance.

1. Core Experience

The player moves through a plain, readable world (paths, trees, landmarks).

There is no fighting, no quests pushing the player forward, and minimal UI.

The act of finding your way is the gameplay.

2. Navigation Philosophy

The game deliberately withholds modern navigation aids:

No minimap showing “you are here”

No GPS-style arrow or waypoint

Instead, players must learn to navigate using:

Landmarks (paths, tree clusters, terrain changes)

A non-detailed map that shows relationships but not position

The sky and stars as a directional reference

3. Why It Must Be 3D

A 3D world allows the player to:

Physically look up at the sky

Orient themselves using constellations, star movement, and horizon

The sky is not decorative—it’s an information system

This mirrors real-world navigation (pre-modern, maritime, desert, or wilderness travel)

4. Tone and Aesthetic

Visually simple and restrained

Closer to:

RuneScape’s readability

A walking simulator’s calm pacing

A hiking or orienteering experience

The world should feel:

Quiet

Slightly mysterious

Intentionally under-informative

5. Long-Term Vision (Implied)

The game becomes a learning space:

Players slowly internalize the world

They recognize stars, directions, and landmarks without prompts

Success feels like:

“I know where I am”

Not “I completed a task”

6. Technical Direction (Current)

Built in HTML + JavaScript

Uses WebGL / Three.js

Starts with a minimal prototype to:

Prove that the sky + navigation concept works

Explore graphical limits without over-engineering


To run:
python -m http.server 8080

## Running locally (recommended)
Because this project uses ES modules (and Three.js addons), open it via a local HTTP server (not by double-clicking `index.html`):

```powershell
python -m http.server 8080
```

Then visit `http://localhost:8080/index.html`.

## Stars / sky (where to extend)
The starfield is in `src/stars.js` and is intentionally designed to be extended later:

- **Seeded star generation**: change the `seed` passed in `index.html` to keep star layouts stable while you experiment.
- **Constellations / patterns**: use `starSystem.addConstellation({ points: [...] })` to draw your own line patterns on top of the star dome.