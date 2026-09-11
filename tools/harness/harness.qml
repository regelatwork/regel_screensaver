import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import "../../engine"

ApplicationWindow {
    id: root
    visible: true
    width: 1360
    height: 768
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
    property point pointerMomentum: Qt.point(0.0, 0.0) // Persistent fluid stirring inertia
    property string sessionState: "Active"
    property int selectedConcept: 1
    property bool lockscreenMode: false

    // Keystroke & Drift States
    property point keystrokePos: Qt.point(0.5, 0.5)
    property point keystrokeDir: Qt.point(0.0, 1.0)
    property point ambientDrift: Qt.point(0.0, 0.0)
    property point beatCenter: Qt.point(0.5, 0.5)
    property int keystrokeCounter: 0
    property int wallpaperModeCycle: 0 // 0 = Layout, 1 = Spiral, 2 = Character Hash

    // Palette Colors
    property int selectedPalette: 0
    readonly property var palettes: [
        { name: "Cyber Neon",        bg: "#02040a", dye1: "#00d4ff", dye2: "#ff007f", dye3: "#ffaa00" },
        { name: "Bioluminescent",    bg: "#01080e", dye1: "#00ffa3", dye2: "#00c8ff", dye3: "#a855f7" },
        { name: "Solar Flare/Magma", bg: "#0d0402", dye1: "#ff9900", dye2: "#ff2200", dye3: "#ffffff" },
        { name: "Quicksilver Metal", bg: "#08080a", dye1: "#e2e8f0", dye2: "#94a3b8", dye3: "#38bdf8" },
        { name: "Nordic Aurora",     bg: "#020712", dye1: "#10b981", dye2: "#06b6d4", dye3: "#ec4899" }
    ]

    property color activeBg: palettes[selectedPalette].bg
    property color activeDye1: palettes[selectedPalette].dye1
    property color activeDye2: palettes[selectedPalette].dye2
    property color activeDye3: palettes[selectedPalette].dye3

    // Simulation Frame Loop (60 Hz)
    Timer {
        interval: 16
        running: true
        repeat: true
        onTriggered: {
            root.simTime += 0.016

            // 1. Physical decay of transient impulses
            root.keystrokeEnergy = Math.max(0.0, root.keystrokeEnergy * Math.exp(-2.2 * 0.016))
            root.shockwaveIntensity = Math.max(0.0, root.shockwaveIntensity * Math.exp(-3.0 * 0.016))

            // 2. Fluid Stirring Inertia Decay (Long-lasting momentum)
            root.pointerMomentum = Qt.point(
                root.pointerMomentum.x * Math.exp(-1.4 * 0.016),
                root.pointerMomentum.y * Math.exp(-1.4 * 0.016)
            )

            // Combined pointer velocity (instantaneous + decaying momentum)
            root.pointerVel = Qt.point(
                root.pointerMomentum.x,
                root.pointerMomentum.y
            )

            // 3. Wandering Beat Epicenter (Lissajous trajectory)
            if (chkWanderBeat.checked) {
                root.beatCenter = Qt.point(
                    0.5 + 0.28 * Math.sin(root.simTime * 0.30),
                    0.5 + 0.20 * Math.cos(root.simTime * 0.42)
                )
            } else {
                root.beatCenter = Qt.point(0.5, 0.5)
            }

            // 4. Slow Autonomous Oceanic Drift (adds organic rotation to ambient current)
            let autoAngle = root.simTime * 0.06
            let autoDrift = Qt.point(0.12 * Math.cos(autoAngle), 0.12 * Math.sin(autoAngle))
            root.ambientDrift = Qt.point(
                userDriftX + autoDrift.x,
                userDriftY + autoDrift.y
            )

            // 5. Audio Processing
            if (radAudioLive.checked && typeof liveAudio !== "undefined") {
                root.bass = liveAudio.bass
                root.subBass = liveAudio.subBass
                root.mids = liveAudio.mids
                root.treble = liveAudio.treble
            } else if (radAudioMic.checked && typeof liveAudio !== "undefined") {
                root.bass = liveAudio.bass
                root.subBass = liveAudio.subBass
                root.mids = liveAudio.mids
                root.treble = liveAudio.treble
            } else if (radAudioBeat.checked) {
                let beatPhase = (root.simTime * 2.0) % 1.0
                if (beatPhase < 0.1) {
                    root.bass = 0.85
                    root.subBass = 0.70
                } else {
                    root.bass = Math.max(0.08, root.bass * 0.92)
                    root.subBass = Math.max(0.05, root.subBass * 0.94)
                }
            }

            // Restore baseline vortex speed
            let targetVortex = root.sessionState === "AuthSucceeded" ? 3.0 : 1.0
            root.vortexSpeed += (targetVortex - root.vortexSpeed) * 3.0 * 0.016
        }
    }

    property real userDriftX: 0.0
    property real userDriftY: 0.0

    // Global Key Steering for Oceanic Currents
    Item {
        anchors.fill: parent
        focus: true

        Keys.onPressed: (event) => {
            let handled = false
            if (event.key === Qt.Key_Up) {
                userDriftY = Math.max(-0.6, userDriftY - 0.08)
                handled = true
            } else if (event.key === Qt.Key_Down) {
                userDriftY = Math.min(0.6, userDriftY + 0.08)
                handled = true
            } else if (event.key === Qt.Key_Left) {
                userDriftX = Math.max(-0.6, userDriftX - 0.08)
                handled = true
            } else if (event.key === Qt.Key_Right) {
                userDriftX = Math.min(0.6, userDriftX + 0.08)
                handled = true
            }
            if (handled) {
                event.accepted = true
            }
        }
    }

    function triggerKeystroke(charStr) {
        root.keystrokeCounter++
        root.keystrokeEnergy = Math.min(2.0, root.keystrokeEnergy + 0.45)

        if (root.lockscreenMode) {
            // LOCKSCREEN MODE: 100% pseudo-random location and direction
            // Prevents password leakage to shoulder-surfers
            root.keystrokePos = Qt.point(
                0.15 + 0.70 * Math.random(),
                0.15 + 0.70 * Math.random()
            )
            let angle = Math.random() * 2.0 * Math.PI
            root.keystrokeDir = Qt.point(Math.cos(angle), Math.sin(angle))
        } else {
            // WALLPAPER MODE: Cycles between Layout, Golden Spiral, and Character Hash
            let mode = root.wallpaperModeCycle % 3
            if (mode === 0) {
                // Keyboard layout mapping (QWERTY spatial)
                let c = charStr.toUpperCase()
                let code = c.charCodeAt(0) || 65
                let col = (code - 65) % 10
                let row = Math.floor((code - 65) / 10)
                root.keystrokePos = Qt.point(0.1 + (col / 10.0) * 0.8, 0.2 + (row / 3.0) * 0.6)
                let pushAngle = (col / 10.0) * Math.PI - (Math.PI / 2)
                root.keystrokeDir = Qt.point(Math.cos(pushAngle), Math.sin(pushAngle))
            } else if (mode === 1) {
                // Golden-ratio phyllotaxis spiral
                let phi = 1.6180339887
                let theta = root.keystrokeCounter * 137.5 * (Math.PI / 180.0)
                let r = Math.min(0.42, 0.06 * Math.sqrt(root.keystrokeCounter % 50))
                root.keystrokePos = Qt.point(0.5 + r * Math.cos(theta), 0.5 + r * Math.sin(theta))
                root.keystrokeDir = Qt.point(Math.cos(theta), Math.sin(theta))
            } else {
                // Character-specific hash mapping
                let code = charStr.charCodeAt(0) || 42
                let hX = ((code * 37) % 100) / 100.0
                let hY = ((code * 73) % 100) / 100.0
                let angle = ((code * 137) % 360) * (Math.PI / 180.0)
                root.keystrokePos = Qt.point(0.1 + hX * 0.8, 0.1 + hY * 0.8)
                root.keystrokeDir = Qt.point(Math.cos(angle), Math.sin(angle))
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
            keystrokePos: root.keystrokePos
            keystrokeDir: root.keystrokeDir
            beatCenter: root.beatCenter
            ambientDrift: root.ambientDrift
            colorBg: root.activeBg
            colorDye1: root.activeDye1
            colorDye2: root.activeDye2
            colorDye3: root.activeDye3
        }

        // Pointer Reactive Cursor Halo
        Rectangle {
            x: root.pointerPos.x * canvasArea.width - width / 2
            y: root.pointerPos.y * canvasArea.height - height / 2
            width: 38 + root.mids * 40
            height: width
            radius: width / 2
            color: "transparent"
            border.color: root.activeDye1
            border.width: 2
            opacity: 0.8
        }

        // Interactive MouseArea with Inertia Accumulation
        MouseArea {
            anchors.fill: parent
            hoverEnabled: true
            onPositionChanged: (mouse) => {
                let prevX = root.pointerPos.x
                let prevY = root.pointerPos.y
                let curX = mouse.x / canvasArea.width
                let curY = mouse.y / canvasArea.height
                let dx = curX - prevX
                let dy = curY - prevY

                root.pointerPos = Qt.point(curX, curY)
                // Accumulate fluid stirring kinetic momentum
                root.pointerMomentum = Qt.point(
                    root.pointerMomentum.x + dx * 2.5,
                    root.pointerMomentum.y + dy * 2.5
                )
            }
            onPressed: {
                root.keystrokeEnergy = Math.min(2.0, root.keystrokeEnergy + 0.5)
            }
        }
    }

    // --- Floating Developer Control HUD ---
    Rectangle {
        id: hudPanel
        width: 380
        anchors {
            top: parent.top
            right: parent.right
            bottom: parent.bottom
            margins: 16
        }
        color: Qt.rgba(0.07, 0.10, 0.15, 0.94)
        radius: 12
        border.color: Qt.rgba(0.25, 0.35, 0.5, 0.5)
        border.width: 1

        ScrollView {
            anchors.fill: parent
            anchors.margins: 16

            ColumnLayout {
                width: parent.width - 20
                spacing: 12

                Text {
                    text: "Regel Developer HUD"
                    color: "#00d4ff"
                    font.bold: true
                    font.pixelSize: 18
                }

                // Palette Selector
                RowLayout {
                    Layout.fillWidth: true
                    Text { text: "Palette:"; color: "#94a3b8"; font.bold: true }
                    ComboBox {
                        Layout.fillWidth: true
                        model: [
                            "Cyber Neon (Default)",
                            "Bioluminescent Abyssal",
                            "Solar Flare / Magma",
                            "Quicksilver Metal",
                            "Nordic Aurora"
                        ]
                        currentIndex: root.selectedPalette
                        onActivated: (idx) => root.selectedPalette = idx
                    }
                }

                // Mode Toggle
                RowLayout {
                    Layout.fillWidth: true
                    Text { text: root.lockscreenMode ? "Lockscreen (Secure Random):" : "Wallpaper (Cycling):"; color: "#cbd5e1" }
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
                    placeholderText: "Type letters here (pushes fluid)..."
                    echoMode: root.lockscreenMode ? TextInput.Password : TextInput.Normal
                    color: "#ffffff"
                    background: Rectangle { color: "#0f172a"; radius: 6; border.color: "#334155" }
                    onTextEdited: {
                        let text = txtPasswordSim.text
                        if (text.length > 0) {
                            root.triggerKeystroke(text.charAt(text.length - 1))
                        }
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

                // Audio Source Controls
                Text { text: "Audio Sources (PipeWire / FFT)"; color: "#f8fafc"; font.bold: true }

                ButtonGroup { id: audioSourceGroup }

                RadioButton {
                    id: radAudioBeat
                    text: "Simulated Beat Generator"
                    checked: true
                    ButtonGroup.group: audioSourceGroup
                    onToggled: if (checked && typeof liveAudio !== "undefined") liveAudio.stop()
                }

                RadioButton {
                    id: radAudioLive
                    text: "System Audio (Desktop Output)"
                    ButtonGroup.group: audioSourceGroup
                    onToggled: {
                        if (checked && typeof liveAudio !== "undefined") {
                            liveAudio.setSource("monitor")
                        }
                    }
                }

                RadioButton {
                    id: radAudioMic
                    text: "Microphone Input (Voice/Claps)"
                    ButtonGroup.group: audioSourceGroup
                    onToggled: {
                        if (checked && typeof liveAudio !== "undefined") {
                            liveAudio.setSource("mic")
                        }
                    }
                }

                CheckBox {
                    id: chkWanderBeat
                    text: "Auto-Wander Beat Center"
                    checked: true
                }

                Rectangle { Layout.fillWidth: true; height: 1; color: "#1e293b" }

                // Ambient Drift & Arrow Steering
                Text { text: "Current Steering (Use Arrow Keys)"; color: "#f8fafc"; font.bold: true }
                RowLayout {
                    Layout.fillWidth: true
                    Text { text: "Drift: (" + root.ambientDrift.x.toFixed(2) + ", " + root.ambientDrift.y.toFixed(2) + ")"; color: "#00d4ff"; font.pixelSize: 12 }
                    Button {
                        text: "Reset Drift"
                        onClicked: {
                            userDriftX = 0.0
                            userDriftY = 0.0
                        }
                    }
                }

                Rectangle { Layout.fillWidth: true; height: 1; color: "#1e293b" }

                // Live Metrics
                Text { text: "Telemetry & Performance"; color: "#f8fafc"; font.bold: true }
                Text { text: "Keystroke Energy: " + root.keystrokeEnergy.toFixed(3); color: "#e2e8f0"; font.pixelSize: 11 }
                Text { text: "Fluid Momentum: (" + root.pointerMomentum.x.toFixed(3) + ", " + root.pointerMomentum.y.toFixed(3) + ")"; color: "#e2e8f0"; font.pixelSize: 11 }
                Text { text: "Beat Center: (" + root.beatCenter.x.toFixed(2) + ", " + root.beatCenter.y.toFixed(2) + ")"; color: "#e2e8f0"; font.pixelSize: 11 }
                Text { text: "Sim Time: " + root.simTime.toFixed(1) + "s"; color: "#e2e8f0"; font.pixelSize: 11 }
            }
        }
    }
}
