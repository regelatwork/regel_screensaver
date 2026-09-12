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

    // Upgraded interactive features
    property point keystrokePos: Qt.point(0.5, 0.5)
    property point keystrokeDir: Qt.point(0.0, 1.0)
    property point beatCenter: Qt.point(0.5, 0.5)
    property point ambientDrift: Qt.point(0.0, 0.0)
    property real waterClarity: 1.0

    // Palette Colors (Zen Japanese Pond)
    property color colorWater: "#083344"     // Deep aquamarine clear water
    property color colorPebbles: "#64748b"   // Slate riverbed stones
    property color colorCaustics: "#e0f2fe"  // Sunlight caustic ribbons
    property color colorAccent: "#f97316"    // Sakura / Golden food pellets & flora

    // Neural audio rhythm & vocal choreography
    property real beatPhase: 0.0
    property bool beat: false
    property bool downbeat: false
    property real bpm: 120.0
    property bool isVocal: false
    property real vocalEnergy: 0.0
    property bool transientHit: false

    // Water ripple expansion on downbeat
    property real downbeatRipple: 0.0
    onDownbeatChanged: {
        if (downbeat) {
            downbeatRipple = 1.0
        }
    }

    NumberAnimation on downbeatRipple {
        running: root.downbeatRipple > 0.0
        from: root.downbeatRipple
        to: 0.0
        duration: 320
        easing.type: Easing.OutQuad
    }

    ShaderEffect {
        id: koiShader
        anchors.fill: parent

        // Neural audio aquatic choreography
        readonly property real strokeMod: 1.0 + 0.25 * Math.sin(Math.PI * 2.0 * root.beatPhase)
        readonly property real effectiveShockwave: Math.max(root.shockwaveIntensity, root.downbeatRipple * 0.75)
        readonly property real vocalShimmer: root.isVocal ? root.vocalEnergy * 0.35 : 0.0
        readonly property real effectiveClarity: root.waterClarity * (1.0 + vocalShimmer * 0.25)

        // Uniforms matching GLSL std140 uniform block in koi.frag
        property vector2d u_resolution: Qt.vector2d(Math.max(1.0, root.width), Math.max(1.0, root.height))
        property vector2d u_pointer: Qt.vector2d(root.pointerPos.x, root.pointerPos.y)
        property vector2d u_pointer_vel: Qt.vector2d(root.pointerVel.x, root.pointerVel.y)
        property vector2d u_keystroke_pos: Qt.vector2d(root.keystrokePos.x, root.keystrokePos.y)
        property vector2d u_keystroke_dir: Qt.vector2d(root.keystrokeDir.x, root.keystrokeDir.y)
        property vector2d u_beat_center: Qt.vector2d(root.beatCenter.x, root.beatCenter.y)
        property vector2d u_ambient_drift: Qt.vector2d(root.ambientDrift.x * strokeMod, root.ambientDrift.y * strokeMod)
        property color u_color_water: root.colorWater
        property color u_color_pebbles: root.colorPebbles
        property color u_color_caustics: Qt.rgba(Math.min(1.0, root.colorCaustics.r + vocalShimmer * 0.2), Math.min(1.0, root.colorCaustics.g + vocalShimmer * 0.3), Math.min(1.0, root.colorCaustics.b + vocalShimmer * 0.4), 1.0)
        property color u_color_accent: root.colorAccent
        property real u_time: root.simTime
        property real u_keystroke_energy: root.keystrokeEnergy
        property real u_shockwave_intensity: effectiveShockwave
        property real u_vortex_speed: root.vortexSpeed * strokeMod
        property real u_bass: root.bass
        property real u_mids: root.mids + vocalShimmer * 0.2
        property real u_treble: root.treble + (root.transientHit ? 0.2 : 0.0)
        property real u_water_clarity: effectiveClarity

        vertexShader: Qt.resolvedUrl("shaders/koi.vert.qsb")
        fragmentShader: Qt.resolvedUrl("shaders/koi.frag.qsb")
    }
}
