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

    ShaderEffect {
        id: fluidShader
        anchors.fill: parent

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
        property real u_time: root.simTime
        property real u_keystroke_energy: root.keystrokeEnergy
        property real u_shockwave_intensity: root.shockwaveIntensity
        property real u_vortex_speed: root.vortexSpeed
        property real u_bass: root.bass
        property real u_mids: root.mids
        property real u_treble: root.treble

        vertexShader: Qt.resolvedUrl("shaders/fluid.vert.qsb")
        fragmentShader: Qt.resolvedUrl("shaders/fluid.frag.qsb")
    }
}
