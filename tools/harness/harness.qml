import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import "../../engine"

ApplicationWindow {
    id: root
    visible: true
    width: 1280
    height: 720
    title: "Regel Screensaver & Wallpaper - Interactive Developer Harness"
    color: "#05070a"

    // --- Simulated Engine Uniform State ---
    property real simTime: 0.0
    property real keystrokeEnergy: 0.0
    property real shockwaveIntensity: 0.0
    property real vortexSpeed: 1.0
    property real subBass: 0.08
    property real bass: 0.12
    property real mids: 0.05
    property real treble: 0.05
    property point pointerPos: Qt.point(0.5, 0.5)
    property point pointerVel: Qt.point(0.0, 0.0)
    property string sessionState: "Active"
    property int selectedConcept: 1
    property bool lockscreenMode: false

    // Simulation Frame Loop (60 Hz)
    Timer {
        interval: 16
        running: true
        repeat: true
        onTriggered: {
            root.simTime += 0.016

            // Physical decay
            root.keystrokeEnergy = Math.max(0.0, root.keystrokeEnergy * Math.exp(-2.5 * 0.016))
            root.shockwaveIntensity = Math.max(0.0, root.shockwaveIntensity * Math.exp(-3.0 * 0.016))

            // Restore baseline vortex speed
            let targetVortex = root.sessionState === "AuthSucceeded" ? 3.0 : 1.0
            root.vortexSpeed += (targetVortex - root.vortexSpeed) * 3.0 * 0.016

            // Auto-beat simulation when enabled
            if (chkAutoBeat.checked) {
                let beatPhase = (root.simTime * 2.0) % 1.0
                if (beatPhase < 0.1) {
                    root.bass = 0.85
                    root.subBass = 0.70
                } else {
                    root.bass = Math.max(0.08, root.bass * 0.92)
                    root.subBass = Math.max(0.05, root.subBass * 0.94)
                }
            }
        }
    }

    // --- Background Simulation Canvas ---
    Item {
        id: canvasArea
        anchors.fill: parent

        // Concept 1: Liquid Neon Abyss GPU Shader Simulation
        LiquidNeonAbyss {
            anchors.fill: parent
            visible: root.selectedConcept === 1
            simTime: root.simTime
            keystrokeEnergy: root.keystrokeEnergy
            shockwaveIntensity: root.shockwaveIntensity
            vortexSpeed: root.vortexSpeed
            bass: root.bass
            mids: root.mids
            treble: root.treble
            pointerPos: root.pointerPos
            pointerVel: root.pointerVel
        }

        // Fallback backdrop when other concepts selected
        Rectangle {
            anchors.fill: parent
            visible: root.selectedConcept !== 1
            gradient: Gradient {
                GradientStop { position: 0.0; color: root.sessionState === "AuthFailed" ? "#220508" : "#060912" }
                GradientStop { position: 1.0; color: "#020306" }
            }
        }

        // Concentric Audio Cymatics Rings
        Repeater {
            model: 4
            Rectangle {
                id: cymaticRing
                anchors.centerIn: parent
                width: (index + 1) * 200 * (1.0 + root.bass * 0.4)
                height: width
                radius: width / 2
                color: "transparent"
                border.color: root.sessionState === "AuthFailed" 
                              ? Qt.rgba(1.0, 0.1, 0.2, (0.4 / (index + 1)) * root.shockwaveIntensity)
                              : Qt.rgba(0.0, 0.8, 1.0, (0.3 / (index + 1)) * root.bass)
                border.width: 2 + index
                opacity: 0.7
            }
        }

        // Keystroke Energy Splat Center
        Rectangle {
            id: keystrokeSplat
            x: root.pointerPos.x * canvasArea.width - width / 2
            y: root.pointerPos.y * canvasArea.height - height / 2
            width: 80 + root.keystrokeEnergy * 150
            height: width
            radius: width / 2
            color: Qt.rgba(1.0, 0.2, 0.8, root.keystrokeEnergy * 0.6)
            border.color: Qt.rgba(1.0, 0.8, 0.2, root.keystrokeEnergy)
            border.width: 3
            visible: root.keystrokeEnergy > 0.01
        }

        // Detonation Shockwave Ring (Auth Failed)
        Rectangle {
            id: shockwaveRing
            anchors.centerIn: parent
            width: (1.0 - root.shockwaveIntensity) * canvasArea.width * 1.5
            height: width
            radius: width / 2
            color: "transparent"
            border.color: Qt.rgba(1.0, 0.15, 0.15, root.shockwaveIntensity)
            border.width: 15 * root.shockwaveIntensity
            visible: root.shockwaveIntensity > 0.02
        }

        // Pointer Reactive Cursor Halo
        Rectangle {
            x: root.pointerPos.x * canvasArea.width - width / 2
            y: root.pointerPos.y * canvasArea.height - height / 2
            width: 40 + root.mids * 50
            height: width
            radius: width / 2
            color: "transparent"
            border.color: Qt.rgba(0.2, 1.0, 0.6, 0.8)
            border.width: 2
        }

        // Interactive MouseArea
        MouseArea {
            anchors.fill: parent
            hoverEnabled: true
            onPositionChanged: (mouse) => {
                let prevX = root.pointerPos.x
                let prevY = root.pointerPos.y
                let curX = mouse.x / canvasArea.width
                let curY = mouse.y / canvasArea.height
                root.pointerPos = Qt.point(curX, curY)
                root.pointerVel = Qt.point(curX - prevX, curY - prevY)
            }
            onPressed: {
                root.keystrokeEnergy = Math.min(2.0, root.keystrokeEnergy + 0.5)
            }
        }
    }

    // --- Floating Developer Control HUD ---
    Rectangle {
        id: hudPanel
        width: 360
        anchors {
            top: parent.top
            right: parent.right
            bottom: parent.bottom
            margins: 16
        }
        color: Qt.rgba(0.08, 0.11, 0.16, 0.92)
        radius: 12
        border.color: Qt.rgba(0.25, 0.35, 0.5, 0.5)
        border.width: 1

        ScrollView {
            anchors.fill: parent
            anchors.margins: 16

            ColumnLayout {
                width: parent.width - 20
                spacing: 14

                Text {
                    text: "Regel Developer HUD"
                    color: "#00d4ff"
                    font.bold: true
                    font.pixelSize: 18
                }

                Text {
                    text: "Active Concept: " + root.selectedConcept + " | State: " + root.sessionState
                    color: "#8fa3b7"
                    font.pixelSize: 12
                }

                ComboBox {
                    Layout.fillWidth: true
                    model: [
                        "1. Liquid Neon Abyss",
                        "2. Living Petri Dish (Lenia)",
                        "3. Tranquil Koi Sanctuary",
                        "4. Cosmic Gravitational Sandbox",
                        "5. Synthwave Megacity",
                        "6. Real-Time Ephemeris Biome",
                        "7. Kinetic Spiderweb Harp"
                    ]
                    onActivated: (idx) => root.selectedConcept = idx + 1
                }

                // Mode Toggle
                RowLayout {
                    Layout.fillWidth: true
                    Text { text: "Lockscreen Mode:"; color: "#cbd5e1" }
                    Switch {
                        checked: root.lockscreenMode
                        onToggled: {
                            root.lockscreenMode = checked
                            root.sessionState = checked ? "Locked" : "Active"
                        }
                    }
                }

                Rectangle { Layout.fillWidth: true; height: 1; color: "#1e293b" }

                // Keystroke & Password Simulation
                Text { text: "Interactive Keystroke Input"; color: "#f8fafc"; font.bold: true }

                TextField {
                    id: txtPasswordSim
                    Layout.fillWidth: true
                    placeholderText: "Type password here..."
                    echoMode: TextInput.Password
                    color: "#ffffff"
                    background: Rectangle { color: "#0f172a"; radius: 6; border.color: "#334155" }
                    onTextEdited: {
                        root.keystrokeEnergy = Math.min(2.0, root.keystrokeEnergy + 0.4)
                    }
                    Keys.onPressed: (event) => {
                        if (event.key === Qt.Key_Backspace || event.key === Qt.Key_Delete) {
                            root.keystrokeEnergy = Math.max(0.0, root.keystrokeEnergy - 0.2)
                            root.vortexSpeed = -1.5
                        }
                    }
                }

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8
                    Button {
                        text: "Simulate Fail"
                        Layout.fillWidth: true
                        onClicked: {
                            root.sessionState = "AuthFailed"
                            root.shockwaveIntensity = 1.0
                            txtPasswordSim.text = ""
                        }
                    }
                    Button {
                        text: "Simulate Success"
                        Layout.fillWidth: true
                        onClicked: {
                            root.sessionState = "AuthSucceeded"
                            root.vortexSpeed = 3.0
                            txtPasswordSim.text = ""
                        }
                    }
                }

                Rectangle { Layout.fillWidth: true; height: 1; color: "#1e293b" }

                // Audio Spectrum Controls
                Text { text: "Audio Spectrum (PipeWire FFT)"; color: "#f8fafc"; font.bold: true }

                CheckBox {
                    id: chkAutoBeat
                    text: "Auto Rhythm Beat Generator"
                    checked: true
                }

                RowLayout {
                    Layout.fillWidth: true
                    Text { text: "Bass:"; color: "#94a3b8"; width: 40 }
                    Slider {
                        Layout.fillWidth: true
                        from: 0.05; to: 1.0
                        value: root.bass
                        onMoved: root.bass = value
                    }
                    Text { text: root.bass.toFixed(2); color: "#00d4ff" }
                }

                RowLayout {
                    Layout.fillWidth: true
                    Text { text: "Mids:"; color: "#94a3b8"; width: 40 }
                    Slider {
                        Layout.fillWidth: true
                        from: 0.05; to: 1.0
                        value: root.mids
                        onMoved: root.mids = value
                    }
                    Text { text: root.mids.toFixed(2); color: "#00d4ff" }
                }

                RowLayout {
                    Layout.fillWidth: true
                    Text { text: "Treble:"; color: "#94a3b8"; width: 40 }
                    Slider {
                        Layout.fillWidth: true
                        from: 0.05; to: 1.0
                        value: root.treble
                        onMoved: root.treble = value
                    }
                    Text { text: root.treble.toFixed(2); color: "#00d4ff" }
                }

                Rectangle { Layout.fillWidth: true; height: 1; color: "#1e293b" }

                // Live Metrics
                Text { text: "Simulation Telemetry"; color: "#f8fafc"; font.bold: true }
                Text { text: "Keystroke Energy: " + root.keystrokeEnergy.toFixed(3); color: "#e2e8f0"; font.pixelSize: 11 }
                Text { text: "Shockwave Intensity: " + root.shockwaveIntensity.toFixed(3); color: "#e2e8f0"; font.pixelSize: 11 }
                Text { text: "Pointer: (" + root.pointerPos.x.toFixed(2) + ", " + root.pointerPos.y.toFixed(2) + ")"; color: "#e2e8f0"; font.pixelSize: 11 }
                Text { text: "Sim Time: " + root.simTime.toFixed(1) + "s"; color: "#e2e8f0"; font.pixelSize: 11 }
            }
        }
    }
}
