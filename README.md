# Modern Space War

A local browser version of the classic Spacewar idea: monochrome vector ships, a central gravity star, wraparound space, missiles, and support for 2-6 local players.

The central star is an active gravity well. Ships spawn with sideways drift, can slingshot around the star, and are destroyed if they fall into it. Torpedoes fly straight, matching the original Spacewar feel.

Open `index.html` in a modern browser. No build step is required.

The static game can also be deployed through GitHub Pages. The included Pages workflow publishes the browser files on every push to `master`. Online room play needs the Node server below because GitHub Pages cannot host WebSockets for this game.

For online play, run the local server:

```text
npm start
```

Then open `http://localhost:8080`. One browser clicks `HOST` to create a room, starts the match, and other browsers join with the room code. The host browser owns the physics and connected players send their controls to it. For another computer on the same network, use the host computer's LAN address instead of `localhost`.

For the desktop app:

```text
npm install
npm run electron
```

To build a Windows portable executable:

```text
npm run dist
```

The packaged executable is written under `dist`. The Electron build is for local/offline play; online room hosting still uses the Node server above.

Controls are shown on the start screen. Each player has rotate left, rotate right, thrust, and fire. To remap keys, click a control button, press the new key, or press `Esc` to cancel. `Space`, `Enter`, and `Tab` are reserved for global controls.

Gamepads and joysticks are supported through the browser Gamepad API. Click a player's `PAD` button on the setup screen, then move a stick or press a button on the controller to assign it. Left stick or D-pad left/right rotates, A / left trigger / right trigger / D-pad up thrusts, and B / X / right bumper / D-pad down fires.

Mouse and spinner-style controls are also supported. Click a player's `MOUSE` button before starting. During the match, the browser locks the pointer to the canvas: horizontal movement rotates the ship, left mouse thrusts, and right mouse fires. A USB spinner that appears as mouse movement should work as rotation input.

Touch controls appear on small screens. They drive P1 with rotate left, rotate right, thrust, and fire buttons.

Control profiles can be saved to browser `localStorage`. `JOIN INPUT` lets the next key, gamepad, or mouse claim the next player slot. `WEBHID` opens a guarded raw-HID connection for unusual controllers; generic reports use byte 0 as signed rotation and byte 1 as thrust/fire bits.

Sound, bot count, bot difficulty, attract mode, and tuning sliders are available on the setup screen. Bots fill the highest-numbered player slots, attract mode starts a bot demo while idle, and tuning adjusts turn rate, thrust, and shot speed. Bot difficulty changes reaction time, aim error, leading, fire discipline, and gravity avoidance. Revenge mode makes bots prefer the human player who last killed them.

Modes:

- Free-for-all: classic last-ship and kill scoring.
- Teams: odd/even players are grouped into two sides.
- Bounty: the current leader is marked with `*` and is worth double.
- Gravity king: score by surviving inside the danger ring around the star.

Mutators can be stacked: fuel limits, drifting debris, orbiting moons, comet hazards, ship variants, and close/mid/far/mixed starting orbits.
