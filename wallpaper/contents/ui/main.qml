import QtQuick
import org.kde.plasma.plasmoid
import "../engine"

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

    property int activeConcept: (typeof plasmoid !== "undefined" && plasmoid.configuration && plasmoid.configuration.activeConcept) ? plasmoid.configuration.activeConcept : 1
    property real globalVortexSpeed: (typeof plasmoid !== "undefined" && plasmoid.configuration && plasmoid.configuration.vortexSpeed) ? plasmoid.configuration.vortexSpeed : 0.8

    // Concept 1: Liquid Neon Abyss GPU Shader Visualizer
    LiquidNeonAbyss {
        anchors.fill: parent
        visible: wallpaperRoot.activeConcept === 1
        simTime: wallpaperRoot.simTime
        bass: wallpaperRoot.bass
        mids: wallpaperRoot.mids
        treble: wallpaperRoot.treble
        pointerPos: wallpaperRoot.pointerPos
        pointerVel: wallpaperRoot.pointerVel
        vortexSpeed: wallpaperRoot.globalVortexSpeed
    }

    // Concept 2: The Living Petri Dish (Lenia Continuous Artificial Life)
    LivingPetriDish {
        anchors.fill: parent
        visible: wallpaperRoot.activeConcept === 2
        simTime: wallpaperRoot.simTime
        bass: wallpaperRoot.bass
        mids: wallpaperRoot.mids
        treble: wallpaperRoot.treble
        pointerPos: wallpaperRoot.pointerPos
        pointerVel: wallpaperRoot.pointerVel
        vortexSpeed: wallpaperRoot.globalVortexSpeed
        apertureMode: 0.0
    }

    // Concept 3: The Tranquil Sanctuary (Caustic Koi Pond & Boid Ecosystem)
    TranquilKoiSanctuary {
        anchors.fill: parent
        visible: wallpaperRoot.activeConcept === 3
        simTime: wallpaperRoot.simTime
        bass: wallpaperRoot.bass
        mids: wallpaperRoot.mids
        treble: wallpaperRoot.treble
        pointerPos: wallpaperRoot.pointerPos
        pointerVel: wallpaperRoot.pointerVel
        vortexSpeed: wallpaperRoot.globalVortexSpeed
    }

    // Concept 4: Cosmic Gravitational Sandbox (Black Hole & Relativistic Jets)
    CosmicGravitationalSandbox {
        anchors.fill: parent
        visible: wallpaperRoot.activeConcept === 4
        simTime: wallpaperRoot.simTime
        bass: wallpaperRoot.bass
        mids: wallpaperRoot.mids
        treble: wallpaperRoot.treble
        pointerPos: wallpaperRoot.pointerPos
        pointerVel: wallpaperRoot.pointerVel
        vortexSpeed: wallpaperRoot.globalVortexSpeed
    }

    // Concept 5: Procedural Synthwave Megacity (Cyberpunk Skyline & Raymarched Highway)
    SynthwaveMegacity {
        anchors.fill: parent
        visible: wallpaperRoot.activeConcept === 5
        simTime: wallpaperRoot.simTime
        bass: wallpaperRoot.bass
        mids: wallpaperRoot.mids
        treble: wallpaperRoot.treble
        pointerPos: wallpaperRoot.pointerPos
        pointerVel: wallpaperRoot.pointerVel
        vortexSpeed: wallpaperRoot.globalVortexSpeed
    }

    // Concept 6: Real-Time Ephemeris Biome (Ghibli Weather Terrarium)
    RealtimeEphemerisBiome {
        anchors.fill: parent
        visible: wallpaperRoot.activeConcept === 6
        simTime: wallpaperRoot.simTime
        bass: wallpaperRoot.bass
        mids: wallpaperRoot.mids
        treble: wallpaperRoot.treble
        pointerPos: wallpaperRoot.pointerPos
        pointerVel: wallpaperRoot.pointerVel
        vortexSpeed: wallpaperRoot.globalVortexSpeed
    }

    // Concept 7: Kinetic Spiderweb & Resonance Harp (Tactile Elastic Lattice)
    KineticSpiderwebHarp {
        anchors.fill: parent
        visible: wallpaperRoot.activeConcept === 7
        simTime: wallpaperRoot.simTime
        bass: wallpaperRoot.bass
        mids: wallpaperRoot.mids
        treble: wallpaperRoot.treble
        pointerPos: wallpaperRoot.pointerPos
        pointerVel: wallpaperRoot.pointerVel
        vortexSpeed: wallpaperRoot.globalVortexSpeed
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
