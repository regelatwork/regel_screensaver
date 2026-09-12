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
    property point windVector: Qt.point(0.3, 0.05)

    // Ephemeris & Atmospheric Ingestion Parameters
    property real solarTime: 14.5       // 0.0 to 24.0 solar hours
    property bool syncToSystemClock: true
    property real weatherMode: 0.0      // 0 = Clear, 1 = Rain, 2 = Snow, 3 = Mist
    property real lunarPhase: 0.5       // 0.0 = New Moon, 0.5 = Full Moon, 1.0 = New Moon
    property real fogDensity: 0.5
    property real frostAmount: 0.0

    // Neural audio rhythm & vocal choreography
    property real beatPhase: 0.0
    property bool beat: false
    property bool downbeat: false
    property real bpm: 120.0
    property bool isVocal: false
    property real vocalEnergy: 0.0
    property bool transientHit: false

    // Spore burst & wind flutter on downbeats
    property real sporePulse: 0.0
    onDownbeatChanged: {
        if (downbeat) {
            sporePulse = 1.0
        }
    }

    NumberAnimation on sporePulse {
        running: root.sporePulse > 0.0
        from: root.sporePulse
        to: 0.0
        duration: 280
        easing.type: Easing.OutQuad
    }

    // Studio Ghibli Painterly Biome Palettes
    property color colorSky: "#0f172a"
    property color colorFoliage: "#15803d"
    property color colorSunMoon: "#fde047"
    property color colorWisp: "#facc15"

    readonly property var biomePalettes: [
        {
            name: "Yakushima Ancient Forest (Ghibli Emerald & Sunlight)",
            sky: "#0f172a",
            foliage: "#15803d",
            sunMoon: "#fde047",
            wisp: "#facc15"
        },
        {
            name: "Sakura Spring Dawn (Cherry Blossom & Lavender)",
            sky: "#1e1b4b",
            foliage: "#f472b6",
            sunMoon: "#fda4af",
            wisp: "#f43f5e"
        },
        {
            name: "Autumn Koyo Harvest (Crimson Maple & Amber)",
            sky: "#1c1917",
            foliage: "#dc2626",
            sunMoon: "#f97316",
            wisp: "#fbbf24"
        },
        {
            name: "Alpine Winter Twilight (Cobalt Frost & Powder Snow)",
            sky: "#020617",
            foliage: "#38bdf8",
            sunMoon: "#e0f2fe",
            wisp: "#67e8f9"
        },
        {
            name: "Midnight Bioluminescence (Starry Obsidian & Jade)",
            sky: "#030712",
            foliage: "#10b981",
            sunMoon: "#a7f3d0",
            wisp: "#34d399"
        }
    ]

    property int currentPaletteIndex: 0

    function setBiomePalette(idx) {
        if (idx < 0 || idx >= biomePalettes.length) return
        currentPaletteIndex = idx
        var p = biomePalettes[idx]
        colorSky = Qt.color(p.sky)
        colorFoliage = Qt.color(p.foliage)
        colorSunMoon = Qt.color(p.sunMoon)
        colorWisp = Qt.color(p.wisp)
    }

    // System Clock Synchronizer (calculates true local solar time)
    Timer {
        id: clockTimer
        interval: 1000
        running: root.syncToSystemClock
        repeat: true
        triggeredOnStart: true
        onTriggered: {
            if (root.syncToSystemClock) {
                var d = new Date()
                root.solarTime = d.getHours() + d.getMinutes() / 60.0 + d.getSeconds() / 3600.0
            }
        }
    }

    ShaderEffect {
        id: ephemerisShader
        anchors.fill: parent

        // Neural audio ephemeris & biome choreography
        readonly property real vocalFireflies: root.isVocal ? root.vocalEnergy * 0.45 : 0.0
        readonly property real windGustX: root.windVector.x * (1.0 + 0.45 * Math.sin(Math.PI * 2.0 * root.beatPhase))
        readonly property real windGustY: root.windVector.y * (1.0 + 0.35 * Math.cos(Math.PI * 2.0 * root.beatPhase))
        readonly property real effectiveShockwave: Math.max(root.shockwaveIntensity, root.sporePulse * 0.6)

        // Uniforms matching GLSL std140 uniform block in ephemeris.frag
        property vector2d u_resolution: Qt.vector2d(Math.max(1.0, root.width), Math.max(1.0, root.height))
        property vector2d u_pointer: Qt.vector2d(root.pointerPos.x, root.pointerPos.y)
        property vector2d u_pointer_vel: Qt.vector2d(root.pointerVel.x, root.pointerVel.y)
        property vector2d u_keystroke_pos: Qt.vector2d(root.keystrokePos.x, root.keystrokePos.y)
        property vector2d u_keystroke_dir: Qt.vector2d(root.keystrokeDir.x, root.keystrokeDir.y)
        property vector2d u_beat_center: Qt.vector2d(root.beatCenter.x, root.beatCenter.y)
        property vector2d u_ambient_drift: Qt.vector2d(root.ambientDrift.x, root.ambientDrift.y)
        property color u_color_sky: root.colorSky
        property color u_color_foliage: Qt.rgba(root.colorFoliage.r, Math.min(1.0, root.colorFoliage.g + vocalFireflies * 0.2), root.colorFoliage.b, 1.0)
        property color u_color_sun_moon: root.colorSunMoon
        property color u_color_wisp: Qt.rgba(Math.min(1.0, root.colorWisp.r + vocalFireflies * 0.4), Math.min(1.0, root.colorWisp.g + vocalFireflies * 0.5), Math.min(1.0, root.colorWisp.b + vocalFireflies * 0.2), 1.0)
        property real u_time: root.simTime
        property real u_keystroke_energy: root.keystrokeEnergy
        property real u_shockwave_intensity: effectiveShockwave
        property real u_vortex_speed: root.vortexSpeed
        property real u_bass: root.bass + root.sporePulse * 0.2
        property real u_mids: root.mids + vocalFireflies * 0.25
        property real u_treble: root.treble + (root.transientHit ? 0.25 : 0.0)
        property real u_solar_time: root.solarTime
        property vector2d u_wind_vector: Qt.vector2d(windGustX, windGustY)
        property real u_weather_mode: root.weatherMode
        property real u_lunar_phase: root.lunarPhase
        property real u_fog_density: root.fogDensity
        property real u_frost_amount: root.frostAmount
        property real u_pad1: 0.0
        property real u_pad2: 0.0

        vertexShader: Qt.resolvedUrl("shaders/ephemeris.vert.qsb")
        fragmentShader: Qt.resolvedUrl("shaders/ephemeris.frag.qsb")
    }
}
