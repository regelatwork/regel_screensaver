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

    // Palette Colors
    property color colorBg: "#02040a"
    property color colorDye1: "#00d4ff" // Cyan
    property color colorDye2: "#ff007f" // Magenta
    property color colorDye3: "#ffaa00" // Solar Amber

    // Neural audio rhythm & vocal choreography
    property real beatPhase: 0.0
    property bool beat: false
    property bool downbeat: false
    property real bpm: 120.0
    property bool isVocal: false
    property real vocalEnergy: 0.0
    property bool transientHit: false

    // Dynamic downbeat pulse decay
    property real downbeatPulse: 0.0
    onDownbeatChanged: {
        if (downbeat) {
            downbeatPulse = 1.0
        }
    }

    NumberAnimation on downbeatPulse {
        running: root.downbeatPulse > 0.0
        from: root.downbeatPulse
        to: 0.0
        duration: 220
        easing.type: Easing.OutQuad
    }

    ShaderEffect {
        id: fluidShader
        anchors.fill: parent

        // Choreographed neural audio modulations
        readonly property real effectiveVortex: root.vortexSpeed * (1.0 + 0.35 * Math.sin(Math.PI * 2.0 * root.beatPhase))
        readonly property real effectiveShockwave: Math.max(root.shockwaveIntensity, root.downbeatPulse * 0.8)
        readonly property real effectiveMids: root.mids + (root.isVocal ? root.vocalEnergy * 0.35 : 0.0)
        readonly property real effectiveTreble: root.treble + (root.isVocal ? root.vocalEnergy * 0.25 : 0.0) + (root.transientHit ? 0.2 : 0.0)
        readonly property real vocalTint: root.isVocal ? root.vocalEnergy * 0.35 : 0.0

        // Uniforms matching GLSL uniform block
        property vector2d u_resolution: Qt.vector2d(Math.max(1.0, root.width), Math.max(1.0, root.height))
        property vector2d u_pointer: Qt.vector2d(root.pointerPos.x, root.pointerPos.y)
        property vector2d u_pointer_vel: Qt.vector2d(root.pointerVel.x, root.pointerVel.y)
        property vector2d u_keystroke_pos: Qt.vector2d(root.keystrokePos.x, root.keystrokePos.y)
        property vector2d u_keystroke_dir: Qt.vector2d(root.keystrokeDir.x, root.keystrokeDir.y)
        property vector2d u_beat_center: Qt.vector2d(root.beatCenter.x, root.beatCenter.y)
        property vector2d u_ambient_drift: Qt.vector2d(root.ambientDrift.x, root.ambientDrift.y)
        property vector3d u_color_bg: Qt.vector3d(root.colorBg.r, root.colorBg.g, root.colorBg.b)
        property vector3d u_color_dye1: Qt.vector3d(Math.min(1.0, root.colorDye1.r + vocalTint * 0.2), Math.min(1.0, root.colorDye1.g + vocalTint * 0.5), Math.min(1.0, root.colorDye1.b + vocalTint * 0.5))
        property vector3d u_color_dye2: Qt.vector3d(Math.min(1.0, root.colorDye2.r + vocalTint * 0.5), Math.min(1.0, root.colorDye2.g + vocalTint * 0.2), Math.min(1.0, root.colorDye2.b + vocalTint * 0.5))
        property vector3d u_color_dye3: Qt.vector3d(root.colorDye3.r, root.colorDye3.g, root.colorDye3.b)
        property real u_time: root.simTime
        property real u_keystroke_energy: root.keystrokeEnergy
        property real u_shockwave_intensity: effectiveShockwave
        property real u_vortex_speed: effectiveVortex
        property real u_bass: root.bass
        property real u_mids: effectiveMids
        property real u_treble: effectiveTreble

        vertexShader: Qt.resolvedUrl("shaders/fluid.vert.qsb")
        fragmentShader: Qt.resolvedUrl("shaders/fluid.frag.qsb")
    }
}
