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

    // Mitosis division pulse on downbeats
    property real mitosisPulse: 0.0
    onDownbeatChanged: {
        if (downbeat) {
            mitosisPulse = 1.0
        }
    }

    NumberAnimation on mitosisPulse {
        running: root.mitosisPulse > 0.0
        from: root.mitosisPulse
        to: 0.0
        duration: 260
        easing.type: Easing.OutQuad
    }

    ShaderEffect {
        id: petriShader
        anchors.fill: parent

        // Neural audio biological choreography
        readonly property real effectiveVortex: root.vortexSpeed * (1.0 + 0.3 * Math.sin(Math.PI * 2.0 * root.beatPhase))
        readonly property real effectiveShockwave: Math.max(root.shockwaveIntensity, root.mitosisPulse * 0.85)
        readonly property real effectiveMids: root.mids + (root.isVocal ? root.vocalEnergy * 0.3 : 0.0)
        readonly property real effectiveTreble: root.treble + (root.transientHit ? 0.25 : 0.0)
        readonly property real vocalGlowFactor: root.isVocal ? root.vocalEnergy * 0.4 : 0.0

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
        property color u_color_organelle: Qt.rgba(Math.min(1.0, root.colorOrganelle.r + vocalGlowFactor * 0.3), Math.min(1.0, root.colorOrganelle.g + vocalGlowFactor * 0.6), Math.min(1.0, root.colorOrganelle.b + vocalGlowFactor * 0.2), 1.0)
        property color u_color_glow: Qt.rgba(Math.min(1.0, root.colorGlow.r + vocalGlowFactor * 0.5), Math.min(1.0, root.colorGlow.g + vocalGlowFactor * 0.2), Math.min(1.0, root.colorGlow.b + vocalGlowFactor * 0.6), 1.0)
        property real u_time: root.simTime * (root.bpm / 120.0)
        property real u_keystroke_energy: root.keystrokeEnergy
        property real u_shockwave_intensity: effectiveShockwave
        property real u_vortex_speed: effectiveVortex
        property real u_bass: root.bass
        property real u_mids: effectiveMids
        property real u_treble: effectiveTreble
        property real u_aperture_mode: root.apertureMode

        vertexShader: Qt.resolvedUrl("shaders/petri.vert.qsb")
        fragmentShader: Qt.resolvedUrl("shaders/petri.frag.qsb")
    }
}
