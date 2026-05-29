# Hotpot

A browser-based card game inspired by the Hotpot minigame from Palia. Built with the custom ActionEngineJS framework.

## Gameplay

- 96 cards across 8 categories (Noodles, Fish, Greens, Spices, Veggies, Meat, Shrooms, Carbs)
- Each player starts with 8 cards
- On your turn: draw a card, then discard one
- Build 3 sets (three-of-a-kind by ingredient) to win
- Play against 3 bots or other human players online

## Features

- **Single-player** with 3 AI difficulty levels (Easy, Medium, Hard)
- **Online multiplayer** — host-authoritative P2P networking with drop-in/drop-out support
- **4-player max** — local human + up to 3 remote players or bots
- **Animated card rendering** — smooth deal, draw, discard, and flip animations
- **ActionEngineJS** — custom game engine with 2D/3D rendering, physics, UI framework, and audio

## Tech Stack

- **Pure JavaScript** — no build step, no frameworks
- **HTML5 Canvas** — 2D rendering for the game board
- **WebGL** — 3D rendering via the ActionEngine
- **ActionNet** — custom P2P networking layer with a Node.js relay server
- **SoundFont** — audio synthesis via SF2 sound fonts

## Project Structure

```
index.html          # Entry point — loads all engine modules then game modules
Card.js             # Card rendering, animations, and glow effects
game.js             # Main game loop, state management, turn logic
game/               # Game logic modules
  constants.js      # HOTPOT config: categories, colors, speeds, bot AI
  GameState.js      # Deck, players, turn tracking
  NetworkSession.js # Host-authoritative multiplayer session
  PlayerEntity.js   # Player representation (human or bot)
  MenuManager.js    # Menu system (main menu, waiting room, settings)
  ActionNetInputManager.js  # Networked input routing
  WaitingMenusInputManager.js # Input handling during lobby
actionengine/       # Game engine (see individual READMEs)
  3rdparty/         # Goblin physics engine fork
  camera/           # Camera and view frustum culling
  character/        # Character controller
  core/             # App bootstrap
  debug/            # Debug panels (lighting, etc.)
  display/          # Canvas management
  geometry/         # GLB loader/exporter, model registry
  gl/               # WebGL shaders and program management
  input/            # Input handling
  math/             # Vector, matrix, quaternion, transform
  network/          # ActionNet P2P client/server
  physics/          # 2D and 3D physics (AABB, collision, rigidbody)
  rendering/        # 2D/3D renderers, lighting, textures
  sound/            # Audio manager with SoundFont support
  ui/               # ActionUI component library
  util/             # Utilities (ZIP compression, etc.)
```

## Running Locally

Open `index.html` in a modern browser. No server required for single-player.

For online multiplayer, the ActionNet server must be running. Server files are in `actionengine/network/server/`.

## Engine

This project uses **ActionEngineJS**, a custom JavaScript game engine. See the README files inside `actionengine/` subdirectories for engine-specific documentation.
