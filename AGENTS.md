# AGENTS.md — Regel Screensaver Engineering & Visual QA Guide

This file documents repository conventions, shader engineering rules, and the visual capture-and-iteration workflow for future sessions in `regel_screensaver`.

---

## 1. Repository Map

- `engine/` — Qt 6 Quick / QML visual concepts (`*.qml`), shared palettes (`engine/Palettes.qml`), and GLSL shaders (`engine/shaders/*.vert`, `engine/shaders/*.frag`). Compiled `*.qsb` shader bundles are gitignored and built via `./tools/build-shaders.sh`.
- `crates/` — Rust workspace (`regel-engine` FFI physics/clock state, `regel-audio` PipeWire/DSP audio reactivity, `regel-daemon`).
- `wallpaper/`, `lockscreen/`, `plasmoid/` — KDE Plasma 6 plugin shells, `metadata.json`, and KConfigXT (`contents/config/main.xml`).
- `tools/` — Developer & packaging scripts:
  - `tools/build-shaders.sh` — Compiles all GLSL shaders to Qt 6 RHI `.qsb` bundles (`100 es`, `120`, `330`, SPIR-V).
  - `tools/capture.py` — Hardware-rendered Qt 6 RHI screenshot & grid generator.
  - `tools/run-harness.sh` + `tools/harness/harness.qml` — Interactive desktop preview harness.
  - `tools/build-deb.sh`, `tools/package-src.sh` — Debian binary & source packaging.
- `tests/run_all_tests.sh` — Full 8-stage verification suite (docs, JSON/KConfigXT, shaders, Rust tests, `qmllint`, fortune rotation, `.deb` build, Lintian).
- `assets/screenshots/` — Committed showcase screenshots embedded in `README.md` and `docs/`.

---

## 2. Visual Capture & Iteration Loop

Whenever modifying shaders, procedural materials, lighting, medallions, or palettes, **verify the actual hardware-rendered output visually** rather than relying solely on shader compilation:

1. **Edit** shader (`.frag`/`.vert`), QML (`engine/*.qml`), or palettes (`engine/Palettes.qml`, `tools/harness/harness.qml`).
2. **Compile shaders**:
   ```bash
   ./tools/build-shaders.sh
   ```
   Always run this before capturing — `QQuickView` loads the compiled `.qsb` files, not the raw `.frag` source.
3. **Capture hardware-rendered previews** with `tools/capture.py`:
   - Single concept / specific palette to `/tmp/` for rapid iteration:
     ```bash
     /usr/bin/python3 tools/capture.py --target concept --concept 9 --palette 8 \
       --width 960 --height 540 --warmup 2.0 --output /tmp/preview.jpg
     ```
   - Hero screenshot (Concept 09 default palette):
     ```bash
     /usr/bin/python3 tools/capture.py --target concept --concept 9 --palette 0 \
       --width 1280 --height 720 --warmup 3.5 \
       --output assets/screenshots/concept-9-embossed-glyph.jpg
     ```
   - 3×2 Concept 09 substrates & medallions showcase grid:
     ```bash
     /usr/bin/python3 tools/capture.py --target glyph-grid \
       --output assets/screenshots/concept-9-substrates-grid.jpg
     ```
4. **Visually inspect** every captured image directly (using image-capable `read_file`):
   - Check exposure/clipping, material contrast, Voronoi/noise seams, medallion relief & shadows, and startup state (no ghosting from default palette `0` during `--warmup`).
   - Spot-check multiple palettes (e.g., light vs. dark, glossy vs. matte, and each medallion/seal style).
5. **Iterate** on shader/QML parameters (repeat steps 1–4) until every inspected frame looks clean and intentional.
6. **Clean up** temporary `/tmp/*.jpg` inspection files, refresh any affected screenshots in `assets/screenshots/`, and run `./tests/run_all_tests.sh`.

### Qt 6 RHI Capture Notes
- **GPU display required**: `tools/capture.py` and `tools/run-harness.sh` require access to the host Wayland/X11 GPU display. Running under `QT_QPA_PLATFORM=offscreen` produces blank solid frames because there is no hardware RHI/OpenGL context.
- **Multi-tile QML caching**: When switching temporary QML wrappers on a reused `QQuickView` in `tools/capture.py`, always clear the source (`view.setSource(QUrl())`), call `view.engine().clearComponentCache()`, and use capitalized filenames (`RegelCap_*.qml`) to prevent Qt `File name case mismatch` white tiles.

---

## 3. Shader & QML Engineering Rules

### GLSL / Qt 6 RHI (`qsb`)
- **Cross-target compatibility**: Every shader must compile cleanly via `./tools/build-shaders.sh` across GLSL `100 es`, `120`, `330`, and SPIR-V with zero warnings or errors.
- **`std140` 16-byte alignment**: Keep `layout(std140, binding = 0) uniform buf` strictly 16-byte aligned and match QML `ShaderEffect` property types/names exactly. Prefer packing new scalar parameters into existing `vec4` slots before expanding the uniform block.
- **Long-running float32 precision safety**: Screensavers run continuously for hours or days. Never feed unbounded `u_time` or unbounded scroll offsets into trig, noise, or hash functions:
  - Wrap periodic coordinates (`mod(..., 256.0)` for lattice noise, `mod(..., 6.2831853)` for trig phases).
  - Wrap high-frequency microflake/glitter scroll on the 64-bit CPU/QML side (`mod 4096.0`) and compute `dFdx`/`dFdy` on scroll-free screen coordinates.
  - Use sine-free integer/polynomial `hash22` synchronized identically between QML and GLSL.
  - Keep `regel-engine` Rust clocks harmonically wrapped in `f32`.
- **Performance awareness**:
  - Hardware `dFdx`/`dFdy` normals keep `getSurface()` to 1 call/pixel.
  - Use rotation-invariant bounding-radius early-outs before heavy SDF evaluations (e.g., the 3×3 glyph neighborhood loop in `glyph.frag`).
  - Gate theme-specific BRDFs (e.g., Marschner wood fibers, thin-film iridescence) behind uniform or low-divergence substrate masks so inactive themes pay zero cost.

### QML Lifecycle & Palettes
- **Viewport geometry readiness**: `Component.onCompleted` can fire while `width == 0` / `height == 0`. Guard viewport-dependent initialization (such as medallion slot spawning) with `if (root.width <= 10 || root.height <= 10) return;` and trigger it from `onWidthChanged` / `onHeightChanged`.
- **No startup cross-fade ghosting**: During QML instantiation, property change handlers (`onAutoCycleThemesChanged`, `onPaletteIndexChanged`) may fire before `Component.onCompleted` finishes. Snap initial substrate/palette state immediately while `!isStarted`, and only animate transitions after `isStarted = true`.
- **Keep palettes in sync**: When adding or editing palettes in `engine/Palettes.qml`, update the matching swatch entries in `tools/harness/harness.qml` as well.

---

## 4. Testing, Commits & Releases

- **Full verification** (run before every commit):
  ```bash
  ./tests/run_all_tests.sh
  ```
  All 8 stages must pass (docs, JSON/KConfigXT, shaders, Rust unit tests, `qmllint`, fortune rotation, `.deb` build, Lintian).
- **Cargo lockfile**: After any version bump in `Cargo.toml`, run `cargo update --workspace --offline` so `cargo test --locked` and Debian builds succeed cleanly.
- **Releases**: Do **not** tag or publish a GitHub release unless explicitly requested by the user.
