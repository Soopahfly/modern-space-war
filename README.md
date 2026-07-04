# Modern Space War

A local browser version of the classic Spacewar idea: monochrome vector ships, a central gravity star, wraparound space, missiles, and support for 2-6 local players.

Open `index.html` in a modern browser. No build step is required.

Controls are shown on the start screen. Each player has rotate left, rotate right, thrust, and fire. To remap keys, click a control button, press the new key, or press `Esc` to cancel. `Space`, `Enter`, and `Tab` are reserved for global controls.

Gamepads and joysticks are supported through the browser Gamepad API. Click a player's `PAD` button on the setup screen, then move a stick or press a button on the controller to assign it. Left stick or D-pad left/right rotates, A / left trigger / right trigger / D-pad up thrusts, and B / X / right bumper / D-pad down fires.

Mouse and spinner-style controls are also supported. Click a player's `MOUSE` button before starting. During the match, the browser locks the pointer to the canvas: horizontal movement rotates the ship, left mouse thrusts, and right mouse fires. A USB spinner that appears as mouse movement should work as rotation input.

Modes:

- Free-for-all: classic last-ship and kill scoring.
- Teams: odd/even players are grouped into two sides.
- Bounty: the current leader is marked with `*` and is worth double.
- Gravity king: score by surviving inside the danger ring around the star.

Mutators can be stacked: fuel limits, drifting debris, orbiting moons, comet hazards, ship variants, and close/mid/far/mixed starting orbits.
