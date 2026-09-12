#!/usr/bin/python3
"""
Regel Headless Capture Engine & Visualizer Benchmarker
Renders authentic, pixel-perfect frames and animations directly from
Qt 6 RHI hardware shaders and Plasma widgets without requiring an active graphical desktop.
"""

import sys
import os
import shutil
import subprocess
import math
import argparse
import time

# Ensure system Python packages (PyQt6, PIL) are discoverable
for p in ["/usr/lib/python3/dist-packages", "/usr/local/lib/python3/dist-packages"]:
    if p not in sys.path and os.path.isdir(p):
        sys.path.insert(0, p)

def ensure_display():
    """Ensures a valid X11 or Wayland display exists. Spawns xvfb-run automatically if headless."""
    if os.environ.get("IN_XVFB") == "1":
        return
    if os.environ.get("WAYLAND_DISPLAY"):
        return
    if os.environ.get("DISPLAY"):
        try:
            res = subprocess.run(["xdpyinfo"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            if res.returncode == 0:
                return
        except Exception:
            pass

    # No functional display; re-exec under xvfb-run
    xvfb = shutil.which("xvfb-run")
    if not xvfb:
        print("Error: Headless capture requires 'xvfb-run' or an active display.", file=sys.stderr)
        sys.exit(1)

    os.environ["IN_XVFB"] = "1"
    cmd = [xvfb, "-a", "-s", "-screen 0 1920x1080x24", "/usr/bin/python3"] + sys.argv
    os.execvp(xvfb, cmd)

ensure_display()

from PyQt6.QtGui import QGuiApplication
from PyQt6.QtQuick import QQuickView
from PyQt6.QtCore import QUrl, QTimer, QEventLoop
from PIL import Image, ImageDraw

WORKSPACE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ENGINE_DIR = os.path.join(WORKSPACE_DIR, "engine")
PLASMOID_DIR = os.path.join(WORKSPACE_DIR, "plasmoid", "contents", "ui")

CONCEPTS = {
    1: {
        "name": "liquid_abyss",
        "title": "Liquid Neon Abyss",
        "snippet": """LiquidNeonAbyss {
            anchors.fill: parent
            simTime: parent.simTime
            bass: parent.bass
            mids: parent.mids
            treble: parent.treble
            colorBg: "#050811"
            colorDye1: "#00ffd5"
            colorDye2: "#ff007f"
            colorDye3: "#7a5cff"
        }"""
    },
    2: {
        "name": "petri_dish",
        "title": "The Living Petri Dish",
        "snippet": """LivingPetriDish {
            anchors.fill: parent
            simTime: parent.simTime
            bass: parent.bass
            mids: parent.mids
            treble: parent.treble
            apertureMode: 0.0
            colorBg: "#02040a"
            colorMembrane: "#00e5ff"
            colorOrganelle: "#ff0077"
            colorGlow: "#00ffaa"
        }"""
    },
    3: {
        "name": "koi_sanctuary",
        "title": "The Tranquil Sanctuary",
        "snippet": """TranquilKoiSanctuary {
            anchors.fill: parent
            simTime: parent.simTime
            bass: parent.bass
            mids: parent.mids
            treble: parent.treble
            waterClarity: 1.2
            colorWater: "#0b233a"
            colorPebbles: "#050d18"
            colorCaustics: "#44ddff"
            colorAccent: "#ff5522"
        }"""
    },
    4: {
        "name": "cosmic_sandbox",
        "title": "Cosmic Gravitational Sandbox",
        "snippet": """CosmicGravitationalSandbox {
            anchors.fill: parent
            simTime: parent.simTime
            bass: parent.bass
            mids: parent.mids
            treble: parent.treble
            lensStrength: 1.2
            autoHyperspace: true
            colorCore: "#000000"
            colorDisk: "#ff6600"
            colorJets: "#00eeff"
            colorNebula: "#220044"
        }"""
    },
    5: {
        "name": "synthwave_megacity",
        "title": "Procedural Synthwave Megacity",
        "snippet": """SynthwaveMegacity {
            anchors.fill: parent
            simTime: parent.simTime
            bass: parent.bass
            mids: parent.mids
            treble: parent.treble
            rainDensity: 0.7
            fogDensity: 0.85
            colorSky: "#1a052e"
            colorNeon1: "#ff007f"
            colorNeon2: "#00ffd5"
            colorGrid: "#ff0055"
        }"""
    },
    6: {
        "name": "ephemeris_biome",
        "title": "Real-Time Ephemeris Biome",
        "snippet": """RealtimeEphemerisBiome {
            anchors.fill: parent
            simTime: parent.simTime
            bass: parent.bass
            mids: parent.mids
            treble: parent.treble
            weatherMode: 0.0
            syncToSystemClock: false
            colorSky: "#1b2838"
            colorFoliage: "#2a5a3a"
            colorSunMoon: "#ffdd88"
            colorWisp: "#66ffcc"
        }"""
    },
    7: {
        "name": "resonance_harp",
        "title": "Kinetic Spiderweb & Resonance Harp",
        "snippet": """KineticSpiderwebHarp {
            anchors.fill: parent
            simTime: parent.simTime
            bass: parent.bass
            mids: parent.mids
            treble: parent.treble
            dewDensity: 0.8
            tension: 1.1
            colorSilk: "#c0d8ff"
            colorDew: "#00ffff"
            colorResonance: "#ff00aa"
            colorVoid: "#050811"
        }"""
    },
}

def qimage_to_pil(qimg):
    """Converts a Qt QImage to a PIL Image."""
    qimg = qimg.convertToFormat(qimg.Format.Format_RGBA8888)
    w, h = qimg.width(), qimg.height()
    ptr = qimg.bits()
    ptr.setsize(h * w * 4)
    return Image.frombuffer("RGBA", (w, h), bytes(ptr), "raw", "RGBA", 0, 1)

class CaptureEngine:
    def __init__(self):
        self.app = QGuiApplication.instance() or QGuiApplication(sys.argv)
        self.view = QQuickView()
        self.view.setResizeMode(QQuickView.ResizeMode.SizeRootObjectToView)

    def wait(self, ms):
        loop = QEventLoop()
        QTimer.singleShot(ms, loop.quit)
        loop.exec()

    def grab_current_frame(self):
        root = self.view.rootObject()
        if not root:
            return None
        loop = QEventLoop()
        grab_res = root.grabToImage()
        grab_res.ready.connect(loop.quit)
        loop.exec()
        qimg = grab_res.image()
        return qimage_to_pil(qimg)

    def capture_still(self, target="concept", concept_id=1, width=1280, height=720, warmup=3.0,
                      bass=0.7, mids=0.5, treble=0.6):
        self.view.resize(width, height)
        qml_path = self.build_qml(target, concept_id, width, height, warmup, bass, mids, treble)
        self.view.setSource(QUrl.fromLocalFile(qml_path))
        self.view.show()
        # Warmup delay for GPU RHI pipeline & physics convergence
        self.wait(int(warmup * 1000) if warmup < 1.0 else 400)
        img = self.grab_current_frame()
        return img

    def capture_animation(self, target="concept", concept_id=1, width=720, height=405,
                          duration=2.0, fps=30, warmup=2.5, audio_sim="beat"):
        self.view.resize(width, height)
        qml_path = self.build_qml(target, concept_id, width, height, warmup, 0.5, 0.4, 0.5)
        self.view.setSource(QUrl.fromLocalFile(qml_path))
        self.view.show()
        self.wait(300)

        root = self.view.rootObject()
        total_frames = max(1, int(round(duration * fps)))
        frames = []

        for f in range(total_frames):
            t = f / total_frames
            cur_sim = warmup + t * duration
            # Audio simulation curve
            if audio_sim == "none":
                b, m, tr = 0.1, 0.1, 0.1
            else:
                phase = t * 2 * math.pi
                b = max(0.12, min(1.0, 0.55 + 0.42 * math.sin(phase * 2)))
                m = max(0.12, min(1.0, 0.45 + 0.35 * math.cos(phase * 3)))
                tr = max(0.12, min(1.0, 0.5 + 0.35 * math.sin(phase * 4)))

            if root:
                root.setProperty("simTime", cur_sim)
                root.setProperty("bass", b)
                root.setProperty("mids", m)
                root.setProperty("treble", tr)

            self.wait(int(1000 / fps))
            frame_img = self.grab_current_frame()
            if frame_img:
                frames.append(frame_img)
            pct = int(((f + 1) / total_frames) * 100)
            sys.stdout.write(f"\rRecording frames: {f + 1}/{total_frames} ({pct}%)")
            sys.stdout.flush()

        print("")
        return frames

    def build_qml(self, target, concept_id, width, height, sim_time, bass, mids, treble):
        path = f"/tmp/regel_cap_{os.getpid()}_{target}_{concept_id}.qml"
        if target == "concept":
            conf = CONCEPTS.get(concept_id, CONCEPTS[1])
            qml = f"""import QtQuick
import "file://{ENGINE_DIR}"

Item {{
    width: {width}
    height: {height}
    property real simTime: {sim_time}
    property real bass: {bass}
    property real mids: {mids}
    property real treble: {treble}

    Rectangle {{
        anchors.fill: parent
        color: "#050811"
    }}

    {conf['snippet']}
}}
"""
        elif target == "widget-desktop":
            qml = f"""import QtQuick
import "file://{PLASMOID_DIR}"
import "file://{ENGINE_DIR}"

Item {{
    width: {width}
    height: {height}

    Item {{
        id: mockPlasmoid
        property int activeConcept: {concept_id}
        property real simTime: {sim_time}
        property real bass: {bass}
        property real mids: {mids}
        property real treble: {treble}
        property real globalVortexSpeed: 0.8
        property bool isAudioLive: true
        property var conceptNames: [
            "1. Liquid Neon Abyss",
            "2. The Living Petri Dish",
            "3. The Tranquil Sanctuary",
            "4. Cosmic Gravitational Sandbox",
            "5. Procedural Synthwave Megacity",
            "6. Real-Time Ephemeris Biome",
            "7. Kinetic Spiderweb & Resonance Harp"
        ]
        Palettes {{ id: palettes }}
        property var currentFluidPalette: palettes.fluidPalettes[0]
        property var currentPetriPalette: palettes.petriPalettes[0]
        property bool petriAperture: false
        property var currentKoiPalette: palettes.koiPalettes[0]
        property real koiWaterClarity: 1.0
        property var currentCosmicPalette: palettes.cosmicPalettes[0]
        property real cosmicLensStrength: 1.0
        property bool cosmicAutoCycle: true
        property var currentCityPalette: palettes.cityPalettes[0]
        property real cityRainDensity: 0.65
        property real cityFogDensity: 0.85
        property var currentBiomePalette: palettes.biomePalettes[0]
        property real biomeWeatherMode: 0
        property bool biomeSyncClock: true
        property var currentHarpPalette: palettes.harpPalettes[0]
        property real harpDewDensity: 0.75
        property real harpTension: 1.0
        function cycleConcept(d) {{}}
    }}

    FullRepresentation {{
        anchors.fill: parent
        plasmoidItem: mockPlasmoid
    }}
}}
"""
        elif target == "widget-panel":
            qml = f"""import QtQuick
import "file://{PLASMOID_DIR}"
import "file://{ENGINE_DIR}"

Item {{
    width: {width}
    height: {height}

    Rectangle {{
        anchors.fill: parent
        color: "#141720"
    }}

    CompactRepresentation {{
        anchors.centerIn: parent
        width: Math.min(parent.width, parent.height) * 0.9
        height: width
        plasmoidItem: QtObject {{
            property bool expanded: false
        }}
        bass: {bass}
        mids: {mids}
        treble: {treble}
        isAudioLive: true
    }}
}}
"""
        with open(path, "w") as f:
            f.write(qml)
        return path

def save_image_file(pil_img, output_path):
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    if output_path.lower().endswith((".jpg", ".jpeg")) and pil_img.mode in ("RGBA", "LA", "P"):
        pil_img = pil_img.convert("RGB")
    pil_img.save(output_path, quality=92 if output_path.lower().endswith((".jpg", ".jpeg")) else None)
    size_kb = os.path.getsize(output_path) // 1024
    print(f"Saved authentic capture -> {output_path} ({size_kb} KB)")

def save_animation_file(frames, output_path, fps=30):
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    if output_path.endswith(".mp4"):
        import tempfile
        print(f"Encoding MP4 video via ffmpeg -> {output_path}...")
        with tempfile.TemporaryDirectory() as tmpdir:
            for i, frame in enumerate(frames):
                frame.save(os.path.join(tmpdir, f"frame_{i:04d}.png"))
            cmd = [
                "ffmpeg", "-y", "-framerate", str(fps),
                "-i", os.path.join(tmpdir, "frame_%04d.png"),
                "-c:v", "libx264", "-pix_fmt", "yuv420p",
                "-crf", "18", output_path
            ]
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    else:
        if not output_path.endswith(".gif"):
            output_path += ".gif"
        print(f"Encoding looping animated GIF -> {output_path}...")
        p_frames = [f.convert("P", palette=Image.ADAPTIVE, colors=128) for f in frames]
        duration_ms = int(1000 / fps)
        p_frames[0].save(
            output_path,
            save_all=True,
            append_images=p_frames[1:],
            duration=duration_ms,
            loop=0,
            optimize=True
        )
    size_kb = os.path.getsize(output_path) // 1024
    print(f"Saved authentic animation -> {output_path} ({size_kb} KB)")

def generate_authentic_grid(engine, output="assets/screenshots/regel-archetypes-grid.jpg"):
    print("\n--- Generating Authentic 2x2 Showcase Grid ---")
    specs = [
        (1, "Liquid Neon Abyss"),
        (3, "The Tranquil Sanctuary"),
        (4, "Cosmic Gravitational Sandbox"),
        (5, "Synthwave Megacity"),
    ]
    captured = []
    for cid, title in specs:
        print(f"Capturing authentic render: Concept {cid} ({title})...")
        img = engine.capture_still(target="concept", concept_id=cid, width=960, height=540, warmup=3.5)
        # Ensure image is resized to 960x540 if high-DPI
        if img.size != (960, 540):
            img = img.resize((960, 540), Image.Resampling.LANCZOS)
        # Subtle title badge
        draw = ImageDraw.Draw(img)
        badge_w = len(title) * 9 + 28
        draw.rounded_rectangle([20, 20, 20 + badge_w, 52], radius=6,
                               fill=(5, 8, 17, 210), outline=(255, 255, 255, 70), width=1)
        draw.text((32, 28), title.upper(), fill=(255, 255, 255, 230))
        captured.append(img)

    grid = Image.new("RGB", (1920, 1080), (5, 8, 17))
    grid.paste(captured[0], (0, 0))
    grid.paste(captured[1], (960, 0))
    grid.paste(captured[2], (0, 540))
    grid.paste(captured[3], (960, 540))

    # Grid divider borders
    draw_grid = ImageDraw.Draw(grid)
    draw_grid.line([(960, 0), (960, 1080)], fill=(30, 45, 70), width=2)
    draw_grid.line([(0, 540), (1920, 540)], fill=(30, 45, 70), width=2)

    os.makedirs(os.path.dirname(os.path.abspath(output)), exist_ok=True)
    grid.save(output, quality=92)
    print(f"Successfully generated authentic 2x2 grid -> {output} ({os.path.getsize(output) // 1024} KB)")

def generate_all_showcase(engine):
    print("\n=======================================================")
    print("   Generating Full Suite of Authentic Capture Assets   ")
    print("=======================================================")

    # 1. Authentic 2x2 Archetype Grid
    generate_authentic_grid(engine, "assets/screenshots/regel-archetypes-grid.jpg")

    # 2. Authentic Desktop Widget with HUD
    print("\nCapturing Authentic Desktop Widget Preview...")
    widget_img = engine.capture_still(target="widget-desktop", concept_id=1, width=1280, height=720, warmup=3.0)
    if widget_img.size != (1280, 720):
        widget_img = widget_img.resize((1280, 720), Image.Resampling.LANCZOS)
    save_image_file(widget_img, "assets/screenshots/regel-widget-preview.jpg")

    # 3. Authentic Hero Banner (Wide concept 1 fluid canvas)
    print("\nCapturing Authentic Hero Banner...")
    hero_img = engine.capture_still(target="concept", concept_id=1, width=1920, height=1080, warmup=4.0, bass=0.85, mids=0.6, treble=0.75)
    if hero_img.size != (1920, 1080):
        hero_img = hero_img.resize((1920, 1080), Image.Resampling.LANCZOS)
    save_image_file(hero_img, "assets/screenshots/regel-hero-banner.jpg")

    # 4. Authentic Looping Animated GIF of Concept 1 Fluid Dynamics
    print("\nRecording Authentic Looping Fluid Dynamics GIF (30 frames, 30 FPS)...")
    anim_frames = engine.capture_animation(target="concept", concept_id=1, width=720, height=405, duration=1.5, fps=30, warmup=3.0)
    save_animation_file(anim_frames, "assets/screenshots/regel-live-equalizer.gif", fps=30)

    print("\n✅ All authentic capture assets generated successfully!")

def main():
    parser = argparse.ArgumentParser(description="Regel Headless Capture Engine & Benchmarker")
    parser.add_argument("--target", choices=["concept", "widget-desktop", "widget-panel", "grid", "all"], default="concept",
                        help="Target element to capture")
    parser.add_argument("--concept", default="1", help="Concept ID (1-7)")
    parser.add_argument("--warmup", type=float, default=2.5, help="Simulation warmup time in seconds")
    parser.add_argument("--duration", type=float, default=0.0, help="Recording duration in seconds (0 for still image)")
    parser.add_argument("--fps", type=int, default=30, help="Frames per second for animation")
    parser.add_argument("--width", type=int, default=1280, help="Capture width in pixels")
    parser.add_argument("--height", type=int, default=720, help="Capture height in pixels")
    parser.add_argument("--audio-sim", choices=["pulse", "beat", "ambient", "none"], default="beat")
    parser.add_argument("--output", help="Output file path (.png, .jpg, .gif, .mp4)")

    args = parser.parse_args()

    engine = CaptureEngine()

    if args.target == "all":
        generate_all_showcase(engine)
        return

    if args.target == "grid":
        out = args.output or "assets/screenshots/regel-archetypes-grid.jpg"
        generate_authentic_grid(engine, out)
        return

    cid = 1
    try:
        cid = int(args.concept)
    except ValueError:
        pass

    out_file = args.output
    if not out_file:
        ext = ".gif" if args.duration > 0 else ".png"
        out_file = f"capture_{args.target}_{cid}{ext}"

    if args.duration > 0:
        frames = engine.capture_animation(
            target=args.target,
            concept_id=cid,
            width=args.width,
            height=args.height,
            duration=args.duration,
            fps=args.fps,
            warmup=args.warmup,
            audio_sim=args.audio_sim
        )
        save_animation_file(frames, out_file, fps=args.fps)
    else:
        img = engine.capture_still(
            target=args.target,
            concept_id=cid,
            width=args.width,
            height=args.height,
            warmup=args.warmup
        )
        if img:
            save_image_file(img, out_file)

if __name__ == "__main__":
    main()
