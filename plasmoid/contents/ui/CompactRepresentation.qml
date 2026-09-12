import QtQuick
import QtQuick.Layouts
import org.kde.plasma.core as PlasmaCore
import org.kde.plasma.plasmoid
import org.kde.kirigami as Kirigami

Item {
    id: compactRoot

    required property var plasmoidItem
    property real bass: 0.08
    property real mids: 0.05
    property real treble: 0.05
    property bool isAudioLive: false

    Layout.minimumWidth: Kirigami.Units.iconSizes.small
    Layout.minimumHeight: Kirigami.Units.iconSizes.small
    Layout.preferredWidth: Kirigami.Units.iconSizes.medium
    Layout.preferredHeight: Kirigami.Units.iconSizes.medium

    // Smooth dampening for audio bars
    property real smoothBass: 0.2
    property real smoothMidLow: 0.2
    property real smoothMidHigh: 0.2
    property real smoothTreble: 0.2

    Behavior on smoothBass { NumberAnimation { duration: 60 } }
    Behavior on smoothMidLow { NumberAnimation { duration: 60 } }
    Behavior on smoothMidHigh { NumberAnimation { duration: 60 } }
    Behavior on smoothTreble { NumberAnimation { duration: 60 } }

    property real idlePhase: 0.0
    Timer {
        interval: 32
        running: true
        repeat: true
        onTriggered: {
            compactRoot.idlePhase += 0.08
            if (compactRoot.isAudioLive) {
                compactRoot.smoothBass = Math.min(1.0, Math.max(0.15, compactRoot.bass * 1.8))
                compactRoot.smoothMidLow = Math.min(1.0, Math.max(0.15, (compactRoot.bass * 0.4 + compactRoot.mids * 0.6) * 1.8))
                compactRoot.smoothMidHigh = Math.min(1.0, Math.max(0.15, (compactRoot.mids * 0.6 + compactRoot.treble * 0.4) * 1.8))
                compactRoot.smoothTreble = Math.min(1.0, Math.max(0.15, compactRoot.treble * 1.8))
            } else {
                // Gentle breathing waveform when idle
                compactRoot.smoothBass = 0.25 + 0.15 * Math.sin(compactRoot.idlePhase)
                compactRoot.smoothMidLow = 0.25 + 0.15 * Math.sin(compactRoot.idlePhase + 1.0)
                compactRoot.smoothMidHigh = 0.25 + 0.15 * Math.sin(compactRoot.idlePhase + 2.0)
                compactRoot.smoothTreble = 0.25 + 0.15 * Math.sin(compactRoot.idlePhase + 3.0)
            }
        }
    }

    // Hover background pill
    Rectangle {
        id: hoverBg
        anchors.fill: parent
        anchors.margins: Kirigami.Units.smallSpacing / 2
        radius: Kirigami.Units.cornerRadius
        color: mouseArea.containsMouse ? Kirigami.Theme.hoverColor : "transparent"
        opacity: 0.4
        Behavior on color { ColorAnimation { duration: 150 } }
    }

    // 4 Animated Audio Spectrum Bars
    Row {
        id: barsRow
        anchors.centerIn: parent
        spacing: Math.max(2, Math.round(width * 0.05))
        width: Math.min(parent.width * 0.7, parent.height * 0.7)
        height: width

        readonly property real barW: Math.max(2, (width - (spacing * 3)) / 4)
        readonly property var levels: [compactRoot.smoothBass, compactRoot.smoothMidLow, compactRoot.smoothMidHigh, compactRoot.smoothTreble]
        readonly property var barColors: [
            "#00ffd5", // Neon cyan
            "#00b8ff", // Electric sky
            "#7a5cff", // Hyper violet
            "#ff007f"  // Magenta pulse
        ]

        Repeater {
            model: 4
            Item {
                width: barsRow.barW
                height: barsRow.height

                Rectangle {
                    anchors.horizontalCenter: parent.horizontalCenter
                    anchors.bottom: parent.bottom
                    width: parent.width
                    height: Math.max(barsRow.barW, barsRow.height * barsRow.levels[index])
                    radius: width / 2
                    color: compactRoot.isAudioLive ? barsRow.barColors[index] : Kirigami.Theme.textColor
                    opacity: compactRoot.isAudioLive ? 0.95 : 0.65

                    // Audio energy glow
                    Rectangle {
                        anchors.top: parent.top
                        anchors.horizontalCenter: parent.horizontalCenter
                        width: parent.width * 1.4
                        height: parent.width * 1.4
                        radius: width / 2
                        color: parent.color
                        opacity: compactRoot.isAudioLive ? 0.6 : 0.0
                    }
                }
            }
        }
    }

    MouseArea {
        id: mouseArea
        anchors.fill: parent
        hoverEnabled: true
        cursorShape: Qt.PointingHandCursor
        onClicked: {
            compactRoot.plasmoidItem.expanded = !compactRoot.plasmoidItem.expanded
        }
    }
}
