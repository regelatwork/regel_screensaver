import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import "../../../engine"

Item {
    id: lockScreenRoot
    anchors.fill: parent

    property real simTime: 0.0
    property real keystrokeEnergy: 0.0
    property real shockwaveIntensity: 0.0
    property real vortexSpeed: 0.5
    property real bass: 0.08
    property real mids: 0.05
    property real treble: 0.05
    property point pointerPos: Qt.point(0.5, 0.5)
    property point pointerVel: Qt.point(0.0, 0.0)

    // Simulation frame & impulse decay loop
    Timer {
        interval: 16
        running: true
        repeat: true
        onTriggered: {
            lockScreenRoot.simTime += 0.016
            lockScreenRoot.keystrokeEnergy = Math.max(0.0, lockScreenRoot.keystrokeEnergy * Math.exp(-2.5 * 0.016))
            lockScreenRoot.shockwaveIntensity = Math.max(0.0, lockScreenRoot.shockwaveIntensity * Math.exp(-3.0 * 0.016))
            lockScreenRoot.vortexSpeed += (1.0 - lockScreenRoot.vortexSpeed) * 2.0 * 0.016
        }
    }

    property int activeConcept: 1

    // Concept 1: Liquid Neon Abyss GPU Shader Visualizer
    LiquidNeonAbyss {
        anchors.fill: parent
        visible: lockScreenRoot.activeConcept === 1
        simTime: lockScreenRoot.simTime
        keystrokeEnergy: lockScreenRoot.keystrokeEnergy
        shockwaveIntensity: lockScreenRoot.shockwaveIntensity
        vortexSpeed: lockScreenRoot.vortexSpeed
        bass: lockScreenRoot.bass
        mids: lockScreenRoot.mids
        treble: lockScreenRoot.treble
        pointerPos: lockScreenRoot.pointerPos
        pointerVel: lockScreenRoot.pointerVel
    }

    // Concept 2: The Living Petri Dish (Lenia Continuous Artificial Life)
    LivingPetriDish {
        anchors.fill: parent
        visible: lockScreenRoot.activeConcept === 2
        simTime: lockScreenRoot.simTime
        keystrokeEnergy: lockScreenRoot.keystrokeEnergy
        shockwaveIntensity: lockScreenRoot.shockwaveIntensity
        vortexSpeed: lockScreenRoot.vortexSpeed
        bass: lockScreenRoot.bass
        mids: lockScreenRoot.mids
        treble: lockScreenRoot.treble
        pointerPos: lockScreenRoot.pointerPos
        pointerVel: lockScreenRoot.pointerVel
        apertureMode: 1.0
    }

    // Concept 3: The Tranquil Sanctuary (Caustic Koi Pond & Boid Ecosystem)
    TranquilKoiSanctuary {
        anchors.fill: parent
        visible: lockScreenRoot.activeConcept === 3
        simTime: lockScreenRoot.simTime
        keystrokeEnergy: lockScreenRoot.keystrokeEnergy
        shockwaveIntensity: lockScreenRoot.shockwaveIntensity
        vortexSpeed: lockScreenRoot.vortexSpeed
        bass: lockScreenRoot.bass
        mids: lockScreenRoot.mids
        treble: lockScreenRoot.treble
        pointerPos: lockScreenRoot.pointerPos
        pointerVel: lockScreenRoot.pointerVel
    }

    // Concept 4: Cosmic Gravitational Sandbox (Black Hole & Relativistic Jets)
    CosmicGravitationalSandbox {
        anchors.fill: parent
        visible: lockScreenRoot.activeConcept === 4
        simTime: lockScreenRoot.simTime
        keystrokeEnergy: lockScreenRoot.keystrokeEnergy
        shockwaveIntensity: lockScreenRoot.shockwaveIntensity
        vortexSpeed: lockScreenRoot.vortexSpeed
        bass: lockScreenRoot.bass
        mids: lockScreenRoot.mids
        treble: lockScreenRoot.treble
        pointerPos: lockScreenRoot.pointerPos
        pointerVel: lockScreenRoot.pointerVel
    }

    // Concept 5: Procedural Synthwave Megacity (Cyberpunk Skyline & Raymarched Highway)
    SynthwaveMegacity {
        anchors.fill: parent
        visible: lockScreenRoot.activeConcept === 5
        simTime: lockScreenRoot.simTime
        keystrokeEnergy: lockScreenRoot.keystrokeEnergy
        shockwaveIntensity: lockScreenRoot.shockwaveIntensity
        vortexSpeed: lockScreenRoot.vortexSpeed
        bass: lockScreenRoot.bass
        mids: lockScreenRoot.mids
        treble: lockScreenRoot.treble
        pointerPos: lockScreenRoot.pointerPos
        pointerVel: lockScreenRoot.pointerVel
    }

    // Concept 6: Real-Time Ephemeris Biome (Ghibli Weather Terrarium)
    RealtimeEphemerisBiome {
        anchors.fill: parent
        visible: lockScreenRoot.activeConcept === 6
        simTime: lockScreenRoot.simTime
        keystrokeEnergy: lockScreenRoot.keystrokeEnergy
        shockwaveIntensity: lockScreenRoot.shockwaveIntensity
        vortexSpeed: lockScreenRoot.vortexSpeed
        bass: lockScreenRoot.bass
        mids: lockScreenRoot.mids
        treble: lockScreenRoot.treble
        pointerPos: lockScreenRoot.pointerPos
        pointerVel: lockScreenRoot.pointerVel
    }

    // Authenticator connection for Plasma 6 kscreenlocker
    Connections {
        target: typeof authenticator !== "undefined" ? authenticator : null
        function onFailed() {
            lockScreenRoot.shockwaveIntensity = 1.0 // Detonates violent crimson cavitation shockwave
            lockScreenRoot.keystrokeEnergy = 0.0
        }
        function onSucceeded() {
            lockScreenRoot.vortexSpeed = 3.5 // Fast laminar vortex clears aperture to desktop
        }
    }

    // Direct exclusive keystroke capture in lockscreen mode
    Keys.onPressed: (event) => {
        if (event.key === Qt.Key_Backspace || event.key === Qt.Key_Delete) {
            lockScreenRoot.keystrokeEnergy = Math.max(0.0, lockScreenRoot.keystrokeEnergy - 0.2)
            lockScreenRoot.vortexSpeed = -1.5 // Negative pressure suction
        } else {
            lockScreenRoot.keystrokeEnergy = Math.min(2.0, lockScreenRoot.keystrokeEnergy + 0.35)
        }
        event.accepted = false // Forward key event to password box
    }

    // Cursor tracking
    MouseArea {
        anchors.fill: parent
        hoverEnabled: true
        onPositionChanged: (mouse) => {
            let curX = mouse.x / width
            let curY = mouse.y / height
            lockScreenRoot.pointerVel = Qt.point(curX - lockScreenRoot.pointerPos.x, curY - lockScreenRoot.pointerPos.y)
            lockScreenRoot.pointerPos = Qt.point(curX, curY)
        }
    }
}
