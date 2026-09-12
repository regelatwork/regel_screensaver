import QtQuick
import org.kde.plasma.plasmoid
import org.kde.plasma.workspace.dbus as PlasmaDBus
import "../engine"

WallpaperItem {
    id: wallpaperRoot
    anchors.fill: parent

    // Base background layer
    Rectangle {
        anchors.fill: parent
        color: "#050811"
        z: -1
    }

    // D-Bus IPC connection to regel-daemon
    PlasmaDBus.Properties {
        id: audioProps
        service: "org.regel.Audio"
        path: "/org/regel/Audio"
        iface: "org.regel.Audio"
        busType: PlasmaDBus.BusType.Session
    }

    property real simTime: 0.0
    property point pointerPos: Qt.point(0.5, 0.5)
    property point pointerVel: Qt.point(0.0, 0.0)

    // Configuration bindings
    property int activeConcept: (wallpaperRoot.configuration && wallpaperRoot.configuration.activeConcept) ? wallpaperRoot.configuration.activeConcept : 1
    property real globalVortexSpeed: (wallpaperRoot.configuration && wallpaperRoot.configuration.vortexSpeed) ? wallpaperRoot.configuration.vortexSpeed : 0.8
    property bool audioReactive: (wallpaperRoot.configuration && typeof wallpaperRoot.configuration.audioReactive !== "undefined") ? wallpaperRoot.configuration.audioReactive : true
    property string configuredAudioSource: (wallpaperRoot.configuration && wallpaperRoot.configuration.audioSource) ? wallpaperRoot.configuration.audioSource : "monitor"
    property bool configuredAudioAutoGain: (wallpaperRoot.configuration && typeof wallpaperRoot.configuration.audioAutoGain !== "undefined") ? wallpaperRoot.configuration.audioAutoGain : true
    property real configuredAudioGain: (wallpaperRoot.configuration && typeof wallpaperRoot.configuration.audioGain !== "undefined") ? wallpaperRoot.configuration.audioGain : 3.5

    // Live audio properties from D-Bus
    property bool isAudioLive: audioProps.properties && typeof audioProps.properties.bass === "number"
    property real liveBass: isAudioLive ? audioProps.properties.bass : 0.08
    property real liveMids: isAudioLive ? audioProps.properties.mids : 0.05
    property real liveTreble: isAudioLive ? audioProps.properties.treble : 0.05

    // Active audio levels fed into visualizers
    property real bass: (audioReactive && isAudioLive) ? liveBass : 0.08
    property real mids: (audioReactive && isAudioLive) ? liveMids : 0.05
    property real treble: (audioReactive && isAudioLive) ? liveTreble : 0.05

    function syncDaemonSettings() {
        try {
            PlasmaDBus.SessionBus.asyncCall({
                service: "org.regel.Audio",
                path: "/org/regel/Audio",
                iface: "org.regel.Audio",
                member: "SetSource",
                arguments: [wallpaperRoot.configuredAudioSource]
            }, function() {}, function() {});

            PlasmaDBus.SessionBus.asyncCall({
                service: "org.regel.Audio",
                path: "/org/regel/Audio",
                iface: "org.regel.Audio",
                member: "SetAutoGain",
                arguments: [wallpaperRoot.configuredAudioAutoGain]
            }, function() {}, function() {});

            PlasmaDBus.SessionBus.asyncCall({
                service: "org.regel.Audio",
                path: "/org/regel/Audio",
                iface: "org.regel.Audio",
                member: "SetGain",
                arguments: [wallpaperRoot.configuredAudioGain]
            }, function() {}, function() {});
        } catch (e) {
            // Daemon will pick up default or active config upon connection
        }
    }

    onConfiguredAudioSourceChanged: syncDaemonSettings()
    onConfiguredAudioAutoGainChanged: syncDaemonSettings()
    onConfiguredAudioGainChanged: syncDaemonSettings()

    Component.onCompleted: {
        syncDaemonSettings();
    }

    Timer {
        id: syncRetryTimer
        interval: 1000
        repeat: false
        running: true
        onTriggered: wallpaperRoot.syncDaemonSettings()
    }

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
