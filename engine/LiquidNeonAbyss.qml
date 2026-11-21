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

    // Audio energy above silence floor (0.0 when silent/idle, up to 1.0 on loud music)
    readonly property real audioEnergy: Math.max(0.0, Math.min(1.0, (root.bass + root.mids + root.treble) * 0.45 - 0.14))

    // Monotonically integrated, wrapped flow time (never reverses, float32-safe for multi-day uptime)
    property real _lastSimTime: -1.0
    property real flowTime: 0.0

    Component.onCompleted: {
        _lastSimTime = root.simTime
        flowTime = (root.simTime * Math.max(0.15, root.vortexSpeed)) % 4096.0
    }

    onSimTimeChanged: {
        if (_lastSimTime < 0.0) {
            _lastSimTime = root.simTime
            flowTime = (root.simTime * Math.max(0.15, root.vortexSpeed)) % 4096.0
            return
        }
        let dt = root.simTime - _lastSimTime
        _lastSimTime = root.simTime
        if (dt > 0.0 && dt < 2.0) {
            let speed = Math.max(0.15, root.vortexSpeed) * (1.0 + root.audioEnergy * 0.65)
            flowTime = (flowTime + dt * speed) % 4096.0
        } else if (dt !== 0.0) {
            flowTime = (root.simTime * Math.max(0.15, root.vortexSpeed)) % 4096.0
        }
    }

    // Dynamic downbeat pulse decay (only triggered when real audio energy is present)
    property real downbeatPulse: 0.0
    onDownbeatChanged: {
        if (downbeat && root.audioEnergy > 0.08) {
            downbeatAnim.restart()
        }
    }

    NumberAnimation {
        id: downbeatAnim
        target: root
        property: "downbeatPulse"
        from: 1.0
        to: 0.0
        duration: 280
        easing.type: Easing.OutQuad
    }

    ShaderEffect {
        id: fluidShader
        anchors.fill: parent

        // Choreographed neural audio modulations (strictly gated on real audio energy so silence never vibrates)
        readonly property real beatMod: root.audioEnergy * 0.22 * (0.5 + 0.5 * Math.sin(Math.PI * 2.0 * root.beatPhase))
        readonly property real effectiveVortex: Math.max(0.15, root.vortexSpeed) * (1.0 + beatMod)
        readonly property real effectiveShockwave: Math.max(root.shockwaveIntensity, root.downbeatPulse * 0.65 * root.audioEnergy)
        readonly property real effectiveMids: root.mids + (root.isVocal ? root.vocalEnergy * 0.30 : 0.0)
        readonly property real effectiveTreble: root.treble + (root.isVocal ? root.vocalEnergy * 0.22 : 0.0) + (root.transientHit && root.audioEnergy > 0.08 ? 0.18 : 0.0)
        readonly property real vocalTint: (root.isVocal && root.audioEnergy > 0.05) ? root.vocalEnergy * 0.30 : 0.0

        // Uniforms matching GLSL uniform block
        property vector2d u_resolution: Qt.vector2d(Math.max(1.0, root.width), Math.max(1.0, root.height))
        property vector2d u_pointer: Qt.vector2d(root.pointerPos.x, root.pointerPos.y)
        property vector2d u_pointer_vel: Qt.vector2d(root.pointerVel.x, root.pointerVel.y)
        property vector2d u_keystroke_pos: Qt.vector2d(root.keystrokePos.x, root.keystrokePos.y)
        property vector2d u_keystroke_dir: Qt.vector2d(root.keystrokeDir.x, root.keystrokeDir.y)
        property vector2d u_beat_center: Qt.vector2d(root.beatCenter.x, root.beatCenter.y)
        property vector2d u_ambient_drift: Qt.vector2d(root.ambientDrift.x, root.ambientDrift.y)
        property vector3d u_color_bg: Qt.vector3d(root.colorBg.r, root.colorBg.g, root.colorBg.b)
        property vector3d u_color_dye1: Qt.vector3d(root.colorDye1.r, root.colorDye1.g, root.colorDye1.b)
        property vector3d u_color_dye2: Qt.vector3d(root.colorDye2.r, root.colorDye2.g, root.colorDye2.b)
        property vector3d u_color_dye3: Qt.vector3d(root.colorDye3.r, root.colorDye3.g, root.colorDye3.b)
        property real u_time: root.flowTime
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
