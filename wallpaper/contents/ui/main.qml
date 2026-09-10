import QtQuick
import org.kde.plasma.plasmoid

Item {
    id: wallpaperRoot
    anchors.fill: parent

    property real simTime: 0.0
    property real bass: 0.1
    property real mids: 0.05
    property real treble: 0.05
    property point pointerPos: Qt.point(0.5, 0.5)

    // Base background tone
    Rectangle {
        anchors.fill: parent
        color: "#030712"
    }

    // Pointer tracker when cursor hovers over exposed desktop
    MouseArea {
        anchors.fill: parent
        hoverEnabled: true
        acceptedButtons: Qt.NoButton // Allows desktop icon clicks to pass through
        onPositionChanged: (mouse) => {
            wallpaperRoot.pointerPos = Qt.point(mouse.x / width, mouse.y / height)
        }
    }
}
