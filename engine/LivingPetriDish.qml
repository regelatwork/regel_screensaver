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
    property real apertureMode: 1.0 // 1.0 = Circular Microscope Slide, 0.0 = Borderless Fullscreen

    // Palette Colors
    property color colorBg: "#01080e"
    property color colorMembrane: "#00ffa3"
    property color colorOrganelle: "#00c8ff"
    property color colorGlow: "#a855f7"

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
    readonly property real audioGate: Math.min(1.0, root.audioEnergy * 4.5)

    // Monotonically integrated, wrapped biological flow time (slow serene drift in silence, float32-safe)
    property real _lastSimTime: -1.0
    property real flowTime: 0.0

    Component.onCompleted: {
        _lastSimTime = root.simTime
        flowTime = (root.simTime * Math.max(0.15, Math.abs(root.vortexSpeed)) * 0.45) % 4096.0
    }

    onSimTimeChanged: {
        let baseSpeed = Math.max(0.15, Math.abs(root.vortexSpeed)) * 0.45
        if (_lastSimTime < 0.0) {
            _lastSimTime = root.simTime
            flowTime = (root.simTime * baseSpeed) % 4096.0
            return
        }
        let dt = root.simTime - _lastSimTime
        _lastSimTime = root.simTime
        if (dt > 0.0 && dt < 2.0) {
            // Smoothly accelerate biological drift when audio is present; never reverse time
            let speed = baseSpeed * (1.0 + root.audioEnergy * 1.15)
            flowTime = (flowTime + dt * speed) % 4096.0
        } else if (dt !== 0.0) {
            flowTime = (root.simTime * baseSpeed) % 4096.0
        }
    }

    // Gentle biological pulse on musical downbeats (strictly gated on real audio energy)
    property real mitosisPulse: 0.0
    onDownbeatChanged: {
        if (downbeat && root.audioEnergy > 0.12) {
            mitosisPulseAnim.restart()
        }
    }

    NumberAnimation {
        id: mitosisPulseAnim
        target: root
        property: "mitosisPulse"
        from: 1.0
        to: 0.0
        duration: 420
        easing.type: Easing.OutCubic
    }

    ShaderEffect {
        id: petriShader
        anchors.fill: parent

        // Strictly audio-gated biological choreography (zero vibration in silence)
        readonly property real effectiveBass: root.bass * root.audioGate
        readonly property real effectiveMids: (root.mids + (root.isVocal ? root.vocalEnergy * 0.25 : 0.0)) * root.audioGate
        readonly property real effectiveTreble: (root.treble + (root.transientHit ? 0.22 : 0.0)) * root.audioGate
        readonly property real effectiveKeystroke: Math.max(root.keystrokeEnergy, root.mitosisPulse * 0.38 * root.audioEnergy)

        // Uniforms matching GLSL std140 uniform block in petri.frag
        property vector2d u_resolution: Qt.vector2d(Math.max(1.0, root.width), Math.max(1.0, root.height))
        property vector2d u_pointer: Qt.vector2d(root.pointerPos.x, root.pointerPos.y)
        property vector2d u_pointer_vel: Qt.vector2d(root.pointerVel.x, root.pointerVel.y)
        property vector2d u_keystroke_pos: Qt.vector2d(root.keystrokePos.x, root.keystrokePos.y)
        property vector2d u_keystroke_dir: Qt.vector2d(root.keystrokeDir.x, root.keystrokeDir.y)
        property vector2d u_beat_center: Qt.vector2d(root.beatCenter.x, root.beatCenter.y)
        property vector2d u_ambient_drift: Qt.vector2d(root.ambientDrift.x, root.ambientDrift.y)
        property color u_color_bg: root.colorBg
        property color u_color_membrane: root.colorMembrane
        property color u_color_organelle: root.colorOrganelle
        property color u_color_glow: root.colorGlow
        property real u_time: root.flowTime
        property real u_keystroke_energy: effectiveKeystroke
        property real u_shockwave_intensity: root.shockwaveIntensity
        property real u_vortex_speed: root.vortexSpeed
        property real u_bass: effectiveBass
        property real u_mids: effectiveMids
        property real u_treble: effectiveTreble
        property real u_aperture_mode: root.apertureMode

        vertexShader: Qt.resolvedUrl("shaders/petri.vert.qsb")
        fragmentShader: Qt.resolvedUrl("shaders/petri.frag.qsb")
    }
}
