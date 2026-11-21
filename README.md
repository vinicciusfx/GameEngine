
## Run

Needs Bend (`bend`) and a clone of [bendlang/bend](https://github.com/bendlang/bend) at `../bend` (the loader in `bunfig.toml`).

```sh
bun install
bun run dev      # http://localhost:3100
bun run check    # laws, types, tests, reference laws, the refs/ fence
bun run build    # bundle to dist/
```

### Windows with WSL 2

Install Bun and Bend inside the Linux distribution. Keep the Bend checkout next to this project, so both are visible from WSL. From PowerShell in the project folder, run the dev server using your default WSL distribution.

```powershell
wsl --cd (Get-Location).Path --exec bash -lc 'bun run dev'
```

Open [the editor](http://localhost:3100/) in your Windows browser. On Windows drives mounted in WSL, the dev server checks source files periodically so it can pick up edits from Windows programs. HLSL needs the Linux versions of [DXC](https://github.com/microsoft/DirectXShaderCompiler/releases) and SPIRV-Cross (`sudo apt install spirv-cross` on Ubuntu).

## Shaders and materials

Open `http://localhost:3100/?project=water` and select **Water**. In **Details → Material → Shader**, choose **Ripples (GLSL)** or **Bands (HLSL)**. Add fragment shaders and their JSON descriptors to `projects/<project>/shaders/`. The dev server rebuilds the catalog when those files change. HLSL import uses DXC and SPIRV-Cross. See the [shader module guide](docs/shaders.md) for the asset format, supported controls, tools, and architectural decisions.

## Files

| File | What it is |
| --- | --- |
| `PROJECT.bend` | The projects (Water, Character), which one opens, and its starting camera |
| `projects/water/` | The Water project: a plane with a material |
| `projects/character/` | The Character project: the hand-written test arm (`arm.bend`) and its scene |
| `engine/world.bend` | The World: origin, axes, units, ground grid, sky, grid fade |
| `engine/camera.bend` | The editor camera: orbit, pan, zoom, view and projection; `close_up()` frames a person |
| `engine/gizmo.bend` | The axis gizmo: handles, hover, click-to-align |
| `engine/vec.bend`, `engine/quat.bend`, `engine/transform.bend` | Vectors, 4x4 matrices, quaternions, position/rotation/scale |
| `engine/scene.bend` | The scene as data: things with a place and a look (Shown, Rigged, Hidden) |
| `engine/mesh.bend`, `engine/material.bend`, `engine/shader/` | Meshes, material graphs, GLSL written by Bend (incl. the skinned shaders) |
| `projects/*/shaders/`, `tools/shaders/`, `editor/shaders/` | Project shader assets, import tools, and the material inspector's controls |
| `engine/skeleton.bend` | The rig standard: bones with roles (Root, Deform, Twist, Support, Chain) and slots, and its laws |
| `engine/pose.bend` | Poses: local transforms, model/world matrices in one pass, bones as lines |
| `engine/clip.bend` | Clips: rotation and position keys, sampled with slerp, looping |
| `engine/gait.bend` | A walk and an idle made by code, per slot, baked into clips |
| `engine/blend.bend` | Two poses mixed by one weight |
| `engine/hand.bend` | The fingers close by one grip number |
| `engine/ik.bend` | Two-bone IK (law of cosines) and feet kept on the floor |
| `engine/helpers.bend` | One rule per Twist and Support bone, applied after the clip |
| `engine/skin.bend` | Skinning matrices, and the weight laws (16-bit, sum 65535) |
| `engine/figure.bend` | The character component: skeleton, skin, clips, helpers, parameters (time, speed, grip, bones) |
| `engine/locomotion.bend` | Walking through the World: Run (keys held) and Step (one step per press, for reduce_motion) |
| `editor/app.js` | The editor: reads input, draws what Bend returns (WebGL2), shared by every page |
| `editor/defaults/` | Editor Defaults: gizmo + info, accessibility (`ACCESSIBILITY.bend`). The info button is a page written in Bend (`view.bend`); the gizmo is a canvas (`defaults.js`) |
| `editor/panels/` | The Scene and Details panels: what they hold (`panels.bend`) and what is drawn for it (`view.bend`, a page written in Bend). No JS of their own: Bend-UI's driver draws them |
| `tools/gltf.ts` | The importer: a .glb + rig.json → skeleton, rules, weights (Bend) and skin.bin |
| `tools/check.ts` | `bun run check`: laws, types, tests, reference laws, the refs/ fence |
| `tests/` | Numerical tests (`checks()` lists), run by `tools/test.ts` |
| `KEYS.bend` | The keymap: views 1–4, walking W/A/S/D |
| `SPEC.bend`, `LAWS.bend`, `PROOF.bend` | The engine's laws and their proofs |
| `main.js`, `index.html` | The engine's page: opens the project PROJECT.bend names |

## Reference characters (`refs/`, never shipped)

`refs/` holds third-party characters used only to study and test the rig
standard. It is gitignored, nothing outside it may import from it
(`bun run check` fails if anything does), and the build never sees it. When
present, `bun run dev` also serves each `refs/<name>/index.html`, and
`bun run check` proves each `refs/<name>/PROOF.bend`.

Re-import the reference after changing its `rig.json`:

```sh
bun tools/gltf.ts refs/sora/gltf/sora_all.glb refs/sora/rig.json refs/sora/gen
```

## Walking

W / S walk ahead and back, A / D turn. With reduce motion on (the default in
`editor/defaults/ACCESSIBILITY.bend`), each press is one step and nothing
moves between presses. With it off, held keys walk continuously.
