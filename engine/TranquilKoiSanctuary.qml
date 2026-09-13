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

    // Forward-only integrated time (strictly forward progression, no backwards temporal oscillation)
    property real koiTime: 0.0
    property real prevSimTime: 0.0
    onSimTimeChanged: {
        var dt = root.simTime - prevSimTime;
        if (dt < 0.0 || dt > 0.25) {
            dt = 0.016;
        }
        prevSimTime = root.simTime;

        // Influence speed ONLY forwards and ONLY so slightly (0.0 to +4% gentle forward impulse during stroke)
        var forwardImpulse = 0.0;
        if (root.beat) {
            forwardImpulse = 0.04;
        } else if (root.beatPhase > 0.0 && root.beatPhase < 0.5) {
            forwardImpulse = 0.025 * Math.sin(root.beatPhase * 2.0 * Math.PI);
        }
        koiTime += dt * (1.0 + Math.max(0.0, forwardImpulse));
    }

    // Gentle, soft water ripple on downbeat
    property real downbeatRipple: 0.0
    onDownbeatChanged: {
        if (downbeat) {
            downbeatAnim.restart();
        }
    }

    NumberAnimation {
        id: downbeatAnim
        target: root
        property: "downbeatRipple"
        from: 1.0
        to: 0.0
        duration: 480
        easing.type: Easing.OutCubic
    }

    ShaderEffect {
        id: koiShader
        anchors.fill: parent

        // Neural audio aquatic choreography - muted, subtle and serene
        readonly property real vocalShimmer: root.isVocal ? root.vocalEnergy * 0.08 : 0.0
        readonly property real effectiveClarity: root.waterClarity * (1.0 + vocalShimmer * 0.04)

        // Uniforms matching GLSL std140 uniform block in koi.frag
        property vector2d u_resolution: Qt.vector2d(Math.max(1.0, root.width), Math.max(1.0, root.height))
        property vector2d u_pointer: Qt.vector2d(root.pointerPos.x, root.pointerPos.y)
        property vector2d u_pointer_vel: Qt.vector2d(root.pointerVel.x, root.pointerVel.y)
        property vector2d u_keystroke_pos: Qt.vector2d(root.keystrokePos.x, root.keystrokePos.y)
        property vector2d u_keystroke_dir: Qt.vector2d(root.keystrokeDir.x, root.keystrokeDir.y)
        property vector2d u_beat_center: Qt.vector2d(root.beatCenter.x, root.beatCenter.y)
        property vector2d u_ambient_drift: Qt.vector2d(root.ambientDrift.x, root.ambientDrift.y)
        property color u_color_water: root.colorWater
        property color u_color_pebbles: root.colorPebbles
        property color u_color_caustics: Qt.rgba(Math.min(1.0, root.colorCaustics.r + vocalShimmer * 0.05), Math.min(1.0, root.colorCaustics.g + vocalShimmer * 0.07), Math.min(1.0, root.colorCaustics.b + vocalShimmer * 0.08), 1.0)
        property color u_color_accent: root.colorAccent
        property real u_time: root.koiTime
        property real u_keystroke_energy: root.keystrokeEnergy * 0.6
        property real u_shockwave_intensity: root.shockwaveIntensity * 0.3
        property real u_vortex_speed: root.vortexSpeed * 0.85
        property real u_bass: Math.min(0.20, root.bass * 0.30 + root.downbeatRipple * 0.03)
        property real u_mids: root.mids * 0.35 + vocalShimmer * 0.04
        property real u_treble: root.treble * 0.30
        property real u_water_clarity: effectiveClarity

        vertexShader: Qt.resolvedUrl("shaders/koi.vert.qsb")
        fragmentShader: Qt.resolvedUrl("shaders/koi.frag.qsb")
    }
}
