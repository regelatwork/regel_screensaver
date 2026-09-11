import QtQuick
import org.kde.plasma.plasmoid
import "../../../engine"

Item {
    id: wallpaperRoot
    anchors.fill: parent

    property real simTime: 0.0
    property real bass: 0.08
    property real mids: 0.05
    property real treble: 0.05
    property point pointerPos: Qt.point(0.5, 0.5)
    property point pointerVel: Qt.point(0.0, 0.0)

    // Simulation frame timer
    Timer {
        interval: 16
        running: true
        repeat: true
        onTriggered: wallpaperRoot.simTime += 0.016
    }

    // Concept 1: Liquid Neon Abyss GPU Shader Visualizer
    LiquidNeonAbyss {
        anchors.fill: parent
        simTime: wallpaperRoot.simTime
        bass: wallpaperRoot.bass
        mids: wallpaperRoot.mids
        treble: wallpaperRoot.treble
        pointerPos: wallpaperRoot.pointerPos
        pointerVel: wallpaperRoot.pointerVel
        vortexSpeed: 0.8
    }

    // Pointer tracker when cursor hovers over exposed desktop
    MouseArea {
        anchors.fill: parent
        hoverEnabled: true
        acceptedButtons: Qt.NoButton // Allows desktop icon clicks to pass through
        onPositionChanged: (mouse) => {
            let curX = mouse.x / width
            let curY = mouse.y / height
            wallpaperRoot.pointerVel = Qt.point(curX - wallpaperRoot.pointerPos.x, curY - wallpaperRoot.pointerPos.y)
            wallpaperRoot.pointerPos = Qt.point(curX, curY)
        }
    }
}
