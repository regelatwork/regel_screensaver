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

    // Interactive Coordinate Mapping & Camera Tilt
    property point keystrokePos: Qt.point(0.5, 0.5)
    property point keystrokeDir: Qt.point(0.0, 1.0)
    property point beatCenter: Qt.point(0.5, 0.5)
    property point ambientDrift: Qt.point(0.0, 0.0)
    property point cameraTilt: Qt.point(0.0, 0.0)

    // Megacity Environmental Controls
    property real searchlightPower: 1.0
    property real rainDensity: 0.65
    property real gridScroll: 0.0
    property real fogDensity: 0.85

    // Cyberpunk Color Palettes
    property color colorSky: "#180c2e"      // Deep violet zenith & night smog
    property color colorNeon1: "#06b6d4"    // Primary cyber cyan / headlights
    property color colorNeon2: "#ec4899"    // Secondary hot magenta / taillights
    property color colorGrid: "#8b5cf6"     // Glowing highway perspective grid

    readonly property var megacityPalettes: [
        {
            name: "Neo-Tokyo Outrun (Cyber Cyan & Hot Magenta)",
            sky: "#180c2e",
            neon1: "#06b6d4",
            neon2: "#ec4899",
            grid: "#8b5cf6"
        },
        {
            name: "Blade Runner 2049 (Amber Smog & Deep Cyan)",
            sky: "#1c1917",
            neon1: "#38bdf8",
            neon2: "#f59e0b",
            grid: "#ea580c"
        },
        {
            name: "Matrix Phosphor (Terminal Emerald & Cyber Mint)",
            sky: "#022c22",
            neon1: "#34d399",
            neon2: "#10b981",
            grid: "#059669"
        },
        {
            name: "Syndicate Blood (Crimson Hazard & Electric Gold)",
            sky: "#1a050b",
            neon1: "#ef4444",
            neon2: "#facc15",
            grid: "#dc2626"
        },
        {
            name: "Retrowave Sunset (Electric Purple & Coral Sun)",
            sky: "#2e1065",
            neon1: "#a855f7",
            neon2: "#fb923c",
            grid: "#f43f5e"
        }
    ]

    property int currentPaletteIndex: 0

    function setCityPalette(idx) {
        if (idx < 0 || idx >= megacityPalettes.length) return
        currentPaletteIndex = idx
        var p = megacityPalettes[idx]
        colorSky = Qt.color(p.sky)
        colorNeon1 = Qt.color(p.neon1)
        colorNeon2 = Qt.color(p.neon2)
        colorGrid = Qt.color(p.grid)
    }

    ShaderEffect {
        id: cityShader
        anchors.fill: parent

        // Uniforms matching GLSL std140 uniform block in city.frag
        property vector2d u_resolution: Qt.vector2d(Math.max(1.0, root.width), Math.max(1.0, root.height))
        property vector2d u_pointer: Qt.vector2d(root.pointerPos.x, root.pointerPos.y)
        property vector2d u_pointer_vel: Qt.vector2d(root.pointerVel.x, root.pointerVel.y)
        property vector2d u_keystroke_pos: Qt.vector2d(root.keystrokePos.x, root.keystrokePos.y)
        property vector2d u_keystroke_dir: Qt.vector2d(root.keystrokeDir.x, root.keystrokeDir.y)
        property vector2d u_beat_center: Qt.vector2d(root.beatCenter.x, root.beatCenter.y)
        property vector2d u_ambient_drift: Qt.vector2d(root.ambientDrift.x, root.ambientDrift.y)
        property color u_color_sky: root.colorSky
        property color u_color_neon1: root.colorNeon1
        property color u_color_neon2: root.colorNeon2
        property color u_color_grid: root.colorGrid
        property real u_time: root.simTime
        property real u_keystroke_energy: root.keystrokeEnergy
        property real u_shockwave_intensity: root.shockwaveIntensity
        property real u_vortex_speed: root.vortexSpeed
        property real u_bass: root.bass
        property real u_mids: root.mids
        property real u_treble: root.treble
        property real u_searchlight_power: root.searchlightPower
        property vector2d u_camera_tilt: Qt.vector2d(root.cameraTilt.x, root.cameraTilt.y)
        property real u_rain_density: root.rainDensity
        property real u_grid_scroll: root.gridScroll
        property real u_fog_density: root.fogDensity
        property real u_pad0: 0.0
        property real u_pad1: 0.0
        property real u_pad2: 0.0

        vertexShader: Qt.resolvedUrl("shaders/city.vert.qsb")
        fragmentShader: Qt.resolvedUrl("shaders/city.frag.qsb")
    }
}
