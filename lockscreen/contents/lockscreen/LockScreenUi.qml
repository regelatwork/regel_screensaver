import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Item {
    id: lockScreenRoot
    anchors.fill: parent

    property real keystrokeEnergy: 0.0
    property real shockwaveIntensity: 0.0
    property point pointerPos: Qt.point(0.5, 0.5)

    // Authenticator connection for Plasma 6 kscreenlocker
    Connections {
        target: typeof authenticator !== "undefined" ? authenticator : null
        function onFailed() {
            lockScreenRoot.shockwaveIntensity = 1.0
            lockScreenRoot.keystrokeEnergy = 0.0
        }
        function onSucceeded() {
            lockScreenRoot.keystrokeEnergy = 1.5
        }
    }

    // Direct exclusive keystroke capture in lockscreen mode
    Keys.onPressed: (event) => {
        if (event.key === Qt.Key_Backspace || event.key === Qt.Key_Delete) {
            lockScreenRoot.keystrokeEnergy = Math.max(0.0, lockScreenRoot.keystrokeEnergy - 0.2)
        } else {
            lockScreenRoot.keystrokeEnergy = Math.min(2.0, lockScreenRoot.keystrokeEnergy + 0.35)
        }
        event.accepted = false // Pass key along to password input box
    }

    // Cursor tracking
    MouseArea {
        anchors.fill: parent
        hoverEnabled: true
        onPositionChanged: (mouse) => {
            lockScreenRoot.pointerPos = Qt.point(mouse.x / width, mouse.y / height)
        }
    }
}
