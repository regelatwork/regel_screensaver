import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import "../engine"

Item {
    id: lockScreenRoot
    anchors.fill: parent

    property real simTime: 0.0
    property real keystrokeEnergy: 0.0
    property real shockwaveIntensity: 0.0
    property real vortexSpeed: 0.5
    property real subBass: 0.05
    property real bass: 0.08
    property real mids: 0.05
    property real treble: 0.05
    property real beatPhase: (lockScreenRoot.simTime * 2.0) % 1.0
    property point pointerPos: Qt.point(0.5, 0.5)
    property point pointerVel: Qt.point(0.0, 0.0)
    property bool pointerValid: false

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
            if (lockScreenRoot.pointerVel.x !== 0.0 || lockScreenRoot.pointerVel.y !== 0.0) {
                let vx = lockScreenRoot.pointerVel.x * 0.82
                let vy = lockScreenRoot.pointerVel.y * 0.82
                if (Math.abs(vx) < 0.0005 && Math.abs(vy) < 0.0005) {
                    vx = 0.0
                    vy = 0.0
                }
                lockScreenRoot.pointerVel = Qt.point(vx, vy)
            }
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
        beatPhase: lockScreenRoot.beatPhase
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
        beatPhase: lockScreenRoot.beatPhase
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
        beatPhase: lockScreenRoot.beatPhase
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
        beatPhase: lockScreenRoot.beatPhase
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
        beatPhase: lockScreenRoot.beatPhase
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
        beatPhase: lockScreenRoot.beatPhase
        pointerPos: lockScreenRoot.pointerPos
        pointerVel: lockScreenRoot.pointerVel
    }

    // Concept 7: Kinetic Spiderweb & Resonance Harp (Tactile Elastic Lattice)
    KineticSpiderwebHarp {
        anchors.fill: parent
        visible: lockScreenRoot.activeConcept === 7
        simTime: lockScreenRoot.simTime
        keystrokeEnergy: lockScreenRoot.keystrokeEnergy
        shockwaveIntensity: lockScreenRoot.shockwaveIntensity
        vortexSpeed: lockScreenRoot.vortexSpeed
        bass: lockScreenRoot.bass
        mids: lockScreenRoot.mids
        treble: lockScreenRoot.treble
        beatPhase: lockScreenRoot.beatPhase
        pointerPos: lockScreenRoot.pointerPos
        pointerVel: lockScreenRoot.pointerVel
    }

    // Concept 8: The Analog Telemetry Console (Dual Ballistic Galvanometers & Phosphor CRT)
    AnalogTelemetryConsole {
        anchors.fill: parent
        visible: lockScreenRoot.activeConcept === 8
        simTime: lockScreenRoot.simTime
        keystrokeEnergy: lockScreenRoot.keystrokeEnergy
        shockwaveIntensity: lockScreenRoot.shockwaveIntensity
        subBass: lockScreenRoot.subBass
        bass: lockScreenRoot.bass
        mids: lockScreenRoot.mids
        treble: lockScreenRoot.treble
        beatPhase: lockScreenRoot.beatPhase
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
        onEntered: {
            lockScreenRoot.pointerValid = false
        }
        onExited: {
            lockScreenRoot.pointerValid = false
            lockScreenRoot.pointerVel = Qt.point(0.0, 0.0)
        }
        onPositionChanged: (mouse) => {
            let curX = Math.max(0.0, Math.min(1.0, mouse.x / width))
            let curY = Math.max(0.0, Math.min(1.0, mouse.y / height))
            if (!lockScreenRoot.pointerValid) {
                lockScreenRoot.pointerValid = true
                lockScreenRoot.pointerPos = Qt.point(curX, curY)
                lockScreenRoot.pointerVel = Qt.point(0.0, 0.0)
                return
            }
            let rawDx = curX - lockScreenRoot.pointerPos.x
            let rawDy = curY - lockScreenRoot.pointerPos.y
            let refScale = Math.max(1.0, width / 1920.0)
            let clDx = Math.max(-0.25, Math.min(0.25, rawDx * refScale))
            let clDy = Math.max(-0.25, Math.min(0.25, rawDy * refScale))
            lockScreenRoot.pointerVel = Qt.point(lockScreenRoot.pointerVel.x * 0.3 + clDx * 0.7, lockScreenRoot.pointerVel.y * 0.3 + clDy * 0.7)
            lockScreenRoot.pointerPos = Qt.point(curX, curY)
        }
    }
}
