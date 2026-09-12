import QtQuick

Item {
    id: root
    anchors.fill: parent

    // Interactive and reactive simulation properties
    property real simTime: 0.0
    property real keystrokeEnergy: 0.0
    property real shockwaveIntensity: 0.0
    property real vortexSpeed: 1.0
    property real bass: 0.08
    property real mids: 0.05
    property real treble: 0.05
    property point pointerPos: Qt.point(0.5, 0.5)
    property point pointerVel: Qt.point(0.0, 0.0)

    // Interactive Coordinate Mapping
    property point keystrokePos: Qt.point(0.5, 0.5)
    property point keystrokeDir: Qt.point(0.0, 1.0)
    property point beatCenter: Qt.point(0.5, 0.5)
    property point ambientDrift: Qt.point(0.0, 0.0)

    // Kinetic Silk Lattice & Acoustic Parameters
    property real tension: 1.0
    property point pluckPoint: Qt.point(0.5, 0.5)
    property real pluckAmplitude: 0.0
    property real dewDensity: 0.75
    property real chromaticDispersion: 0.85
    property real shatterProgress: 0.0

    // Neural audio rhythm & vocal choreography
    property real beatPhase: 0.0
    property bool beat: false
    property bool downbeat: false
    property real bpm: 120.0
    property bool isVocal: false
    property real vocalEnergy: 0.0
    property bool transientHit: false

    onDownbeatChanged: {
        if (downbeat) {
            root.pluck(0.5, 0.5, 0.9)
        }
    }

    onTransientHitChanged: {
        if (transientHit) {
            root.pluck(0.2 + 0.6 * Math.random(), 0.2 + 0.6 * Math.random(), 0.6)
        }
    }

    // Palette Colors (Silk, Dew, Resonance, Void)
    property color colorSilk: "#e2e8f0"
    property color colorDew: "#67e8f9"
    property color colorResonance: "#38bdf8"
    property color colorVoid: "#050814"

    readonly property var harpPalettes: [
        {
            name: "Moonlit Gossamer (Ethereal Silver & Dewdrop Diamond)",
            silk: "#e2e8f0",
            dew: "#67e8f9",
            resonance: "#38bdf8",
            void: "#050814"
        },
        {
            name: "Golden Laser Harp (Warm Amber & Radiant Topaz)",
            silk: "#fef08a",
            dew: "#facc15",
            resonance: "#f59e0b",
            void: "#0c0a00"
        },
        {
            name: "Bioluminescent Abyssal (Deep Emerald & Sea Green)",
            silk: "#a7f3d0",
            dew: "#34d399",
            resonance: "#10b981",
            void: "#022c22"
        },
        {
            name: "Electric Synapse (Neon Magenta & Plasma Violet)",
            silk: "#f472b6",
            dew: "#ec4899",
            resonance: "#a855f7",
            void: "#18021a"
        },
        {
            name: "Frost Crystal Web (Ice Blue & Prismatic Rime)",
            silk: "#f0f9ff",
            dew: "#bae6fd",
            resonance: "#7dd3fc",
            void: "#021220"
        }
    ]

    property int currentPaletteIndex: 0

    function setHarpPalette(idx) {
        if (idx < 0 || idx >= harpPalettes.length) return
        currentPaletteIndex = idx
        var p = harpPalettes[idx]
        colorSilk = Qt.color(p.silk)
        colorDew = Qt.color(p.dew)
        colorResonance = Qt.color(p.resonance)
        colorVoid = Qt.color(p.void)
    }

    function pluck(px, py, amp) {
        pluckPoint = Qt.point(px, py)
        pluckAmplitude = Math.max(pluckAmplitude, amp)
    }

    // Physical mass-spring harmonic damping loop
    Timer {
        interval: 16
        running: true
        repeat: true
        onTriggered: {
            if (root.pluckAmplitude > 0.001) {
                // Damped exponential decay
                root.pluckAmplitude = Math.max(0.0, root.pluckAmplitude * Math.exp(-3.5 * 0.016))
            }
        }
    }

    ShaderEffect {
        id: harpShader
        anchors.fill: parent

        // Neural audio resonance harp choreography
        readonly property real vocalStandingWave: root.isVocal ? root.vocalEnergy * 0.45 : 0.0
        readonly property real effectiveTension: root.tension * (1.0 + 0.28 * Math.cos(Math.PI * 2.0 * root.beatPhase))
        readonly property real effectivePluck: Math.max(root.pluckAmplitude, vocalStandingWave)

        // Uniforms matching GLSL std140 uniform block in harp.frag
        property vector2d u_resolution: Qt.vector2d(Math.max(1.0, root.width), Math.max(1.0, root.height))
        property vector2d u_pointer: Qt.vector2d(root.pointerPos.x, root.pointerPos.y)
        property vector2d u_pointer_vel: Qt.vector2d(root.pointerVel.x, root.pointerVel.y)
        property vector2d u_keystroke_pos: Qt.vector2d(root.keystrokePos.x, root.keystrokePos.y)
        property vector2d u_keystroke_dir: Qt.vector2d(root.keystrokeDir.x, root.keystrokeDir.y)
        property vector2d u_beat_center: Qt.vector2d(root.beatCenter.x, root.beatCenter.y)
        property vector2d u_ambient_drift: Qt.vector2d(root.ambientDrift.x, root.ambientDrift.y)
        property color u_color_silk: root.colorSilk
        property color u_color_dew: root.colorDew
        property color u_color_resonance: Qt.rgba(Math.min(1.0, root.colorResonance.r + vocalStandingWave * 0.3), Math.min(1.0, root.colorResonance.g + vocalStandingWave * 0.4), Math.min(1.0, root.colorResonance.b + vocalStandingWave * 0.5), 1.0)
        property color u_color_void: root.colorVoid
        property real u_time: root.simTime
        property real u_keystroke_energy: root.keystrokeEnergy
        property real u_shockwave_intensity: root.shockwaveIntensity
        property real u_vortex_speed: root.vortexSpeed
        property real u_bass: root.bass
        property real u_mids: root.mids + vocalStandingWave * 0.2
        property real u_treble: root.treble + (root.transientHit ? 0.3 : 0.0)
        property real u_tension: effectiveTension
        property vector2d u_pluck_point: Qt.vector2d(root.pluckPoint.x, root.pluckPoint.y)
        property real u_pluck_amplitude: effectivePluck
        property real u_dew_density: root.dewDensity
        property real u_chromatic_dispersion: root.chromaticDispersion
        property real u_shatter_progress: root.shatterProgress
        property real u_pad1: 0.0
        property real u_pad2: 0.0

        vertexShader: Qt.resolvedUrl("shaders/harp.vert.qsb")
        fragmentShader: Qt.resolvedUrl("shaders/harp.frag.qsb")
    }
}
