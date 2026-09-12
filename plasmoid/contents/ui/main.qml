import QtQuick
import QtQuick.Layouts
import org.kde.plasma.core as PlasmaCore
import org.kde.plasma.plasmoid
import org.kde.plasma.workspace.dbus as PlasmaDBus
import "../engine"

PlasmoidItem {
    id: root

    Plasmoid.backgroundHints: PlasmaCore.Types.DefaultBackground | PlasmaCore.Types.ConfigurableBackground
    Plasmoid.title: i18n("Regel Visualizer")
    Plasmoid.icon: "multimedia-audio-player"

    // When on Desktop (Planar), we always want the visualizer to show fullRepresentation directly!
    // When in Panel, we show compactRepresentation (mini animated visualizer bars), and clicking expands popup.
    preferredRepresentation: Plasmoid.formFactor === PlasmaCore.Types.Planar ? fullRepresentation : null

    // D-Bus IPC connection to regel-daemon
    PlasmaDBus.Properties {
        id: audioProps
        service: "org.regel.Audio"
        path: "/org/regel/Audio"
        iface: "org.regel.Audio"
        busType: PlasmaDBus.BusType.Session
    }

    property real simTime: 0.0

    // Friendly concept names for HUD and Tooltips
    readonly property var conceptNames: [
        "1. Liquid Neon Abyss",
        "2. The Living Petri Dish",
        "3. The Tranquil Sanctuary",
        "4. Cosmic Gravitational Sandbox",
        "5. Procedural Synthwave Megacity",
        "6. Real-Time Ephemeris Biome",
        "7. Kinetic Spiderweb & Resonance Harp",
        "8. Analog Telemetry Console"
    ]

    // Configuration bindings
    property int activeConcept: (Plasmoid.configuration && Plasmoid.configuration.activeConcept) ? Plasmoid.configuration.activeConcept : 1
    property real globalVortexSpeed: (Plasmoid.configuration && Plasmoid.configuration.vortexSpeed) ? Plasmoid.configuration.vortexSpeed : 0.8
    property bool audioReactive: (Plasmoid.configuration && typeof Plasmoid.configuration.audioReactive !== "undefined") ? Plasmoid.configuration.audioReactive : true
    property string configuredAudioSource: (Plasmoid.configuration && Plasmoid.configuration.audioSource) ? Plasmoid.configuration.audioSource : "monitor"
    property bool configuredAudioAutoGain: (Plasmoid.configuration && typeof Plasmoid.configuration.audioAutoGain !== "undefined") ? Plasmoid.configuration.audioAutoGain : true
    property real configuredAudioGain: (Plasmoid.configuration && typeof Plasmoid.configuration.audioGain !== "undefined") ? Plasmoid.configuration.audioGain : 3.5

    function cycleConcept(delta) {
        let count = 8
        let next = ((activeConcept - 1 + delta) % count + count) % count + 1
        activeConcept = next
        if (Plasmoid.configuration) {
            Plasmoid.configuration.activeConcept = next
        }
    }

    Palettes {
        id: palettes
    }

    // --- Concept 1 Parameters ---
    property int concept1PaletteIdx: (Plasmoid.configuration && typeof Plasmoid.configuration.concept1Palette === "number") ? Plasmoid.configuration.concept1Palette : 0
    readonly property var currentFluidPalette: palettes.fluidPalettes[concept1PaletteIdx % palettes.fluidPalettes.length]

    // --- Concept 2 Parameters ---
    property int concept2PaletteIdx: (Plasmoid.configuration && typeof Plasmoid.configuration.concept2Palette === "number") ? Plasmoid.configuration.concept2Palette : 0
    readonly property var currentPetriPalette: palettes.petriPalettes[concept2PaletteIdx % palettes.petriPalettes.length]
    property bool petriAperture: (Plasmoid.configuration && typeof Plasmoid.configuration.petriAperture === "boolean") ? Plasmoid.configuration.petriAperture : false

    // --- Concept 3 Parameters ---
    property int concept3PaletteIdx: (Plasmoid.configuration && typeof Plasmoid.configuration.concept3Palette === "number") ? Plasmoid.configuration.concept3Palette : 0
    readonly property var currentKoiPalette: palettes.koiPalettes[concept3PaletteIdx % palettes.koiPalettes.length]
    property real koiWaterClarity: (Plasmoid.configuration && typeof Plasmoid.configuration.koiWaterClarity === "number") ? Plasmoid.configuration.koiWaterClarity : 1.0

    // --- Concept 4 Parameters ---
    property int concept4PaletteIdx: (Plasmoid.configuration && typeof Plasmoid.configuration.concept4Palette === "number") ? Plasmoid.configuration.concept4Palette : 0
    readonly property var currentCosmicPalette: palettes.cosmicPalettes[concept4PaletteIdx % palettes.cosmicPalettes.length]
    property real cosmicLensStrength: (Plasmoid.configuration && typeof Plasmoid.configuration.cosmicLensStrength === "number") ? Plasmoid.configuration.cosmicLensStrength : 1.0
    property bool cosmicAutoCycle: (Plasmoid.configuration && typeof Plasmoid.configuration.cosmicAutoCycle === "boolean") ? Plasmoid.configuration.cosmicAutoCycle : true

    // --- Concept 5 Parameters ---
    property int concept5PaletteIdx: (Plasmoid.configuration && typeof Plasmoid.configuration.concept5Palette === "number") ? Plasmoid.configuration.concept5Palette : 0
    readonly property var currentCityPalette: palettes.cityPalettes[concept5PaletteIdx % palettes.cityPalettes.length]
    property real cityRainDensity: (Plasmoid.configuration && typeof Plasmoid.configuration.cityRainDensity === "number") ? Plasmoid.configuration.cityRainDensity : 0.65
    property real cityFogDensity: (Plasmoid.configuration && typeof Plasmoid.configuration.cityFogDensity === "number") ? Plasmoid.configuration.cityFogDensity : 0.85

    // --- Concept 6 Parameters ---
    property int concept6PaletteIdx: (Plasmoid.configuration && typeof Plasmoid.configuration.concept6Palette === "number") ? Plasmoid.configuration.concept6Palette : 0
    readonly property var currentBiomePalette: palettes.biomePalettes[concept6PaletteIdx % palettes.biomePalettes.length]
    property real biomeWeatherMode: (Plasmoid.configuration && typeof Plasmoid.configuration.biomeWeatherMode === "number") ? Plasmoid.configuration.biomeWeatherMode : 0.0
    property bool biomeSyncClock: (Plasmoid.configuration && typeof Plasmoid.configuration.biomeSyncClock === "boolean") ? Plasmoid.configuration.biomeSyncClock : true

    // --- Concept 7 Parameters ---
    property int concept7PaletteIdx: (Plasmoid.configuration && typeof Plasmoid.configuration.concept7Palette === "number") ? Plasmoid.configuration.concept7Palette : 0
    readonly property var currentHarpPalette: palettes.harpPalettes[concept7PaletteIdx % palettes.harpPalettes.length]
    property real harpDewDensity: (Plasmoid.configuration && typeof Plasmoid.configuration.harpDewDensity === "number") ? Plasmoid.configuration.harpDewDensity : 0.75
    property real harpTension: (Plasmoid.configuration && typeof Plasmoid.configuration.harpTension === "number") ? Plasmoid.configuration.harpTension : 1.0

    // --- Concept 8 Parameters ---
    property int concept8PaletteIdx: (Plasmoid.configuration && typeof Plasmoid.configuration.concept8Palette === "number") ? Plasmoid.configuration.concept8Palette : 0
    readonly property var currentConsolePalette: palettes.consolePalettes[concept8PaletteIdx % palettes.consolePalettes.length]

    // Live audio properties from D-Bus
    property bool isAudioLive: audioProps.properties && typeof audioProps.properties.bass === "number"
    property real liveSubBass: isAudioLive && typeof audioProps.properties.sub_bass === "number" ? audioProps.properties.sub_bass : 0.05
    property real liveBass: isAudioLive ? audioProps.properties.bass : 0.08
    property real liveMids: isAudioLive ? audioProps.properties.mids : 0.05
    property real liveTreble: isAudioLive ? audioProps.properties.treble : 0.05
    property real liveRms: isAudioLive && typeof audioProps.properties.rms === "number" ? audioProps.properties.rms : 0.05
    property real liveBpm: isAudioLive && typeof audioProps.properties.bpm === "number" ? audioProps.properties.bpm : 120.0
    property bool liveBeat: isAudioLive && typeof audioProps.properties.beat === "boolean" ? audioProps.properties.beat : false
    property bool liveDownbeat: isAudioLive && typeof audioProps.properties.downbeat === "boolean" ? audioProps.properties.downbeat : false
    property bool liveIsVocal: isAudioLive && typeof audioProps.properties.is_vocal === "boolean" ? audioProps.properties.is_vocal : false
    property real liveVocalEnergy: isAudioLive && typeof audioProps.properties.vocal_energy === "number" ? audioProps.properties.vocal_energy : 0.0
    property bool liveTransient: isAudioLive && typeof audioProps.properties.transient === "boolean" ? audioProps.properties.transient : false

    // Active audio levels fed into visualizers
    property real subBass: (audioReactive && isAudioLive) ? liveSubBass : 0.05
    property real bass: (audioReactive && isAudioLive) ? liveBass : 0.08
    property real mids: (audioReactive && isAudioLive) ? liveMids : 0.05
    property real treble: (audioReactive && isAudioLive) ? liveTreble : 0.05
    property real rms: (audioReactive && isAudioLive) ? liveRms : 0.05
    property real bpm: (audioReactive && isAudioLive) ? liveBpm : 120.0
    property bool beat: (audioReactive && isAudioLive) ? liveBeat : false
    property bool downbeat: (audioReactive && isAudioLive) ? liveDownbeat : false
    property bool isVocal: (audioReactive && isAudioLive) ? liveIsVocal : false
    property real vocalEnergy: (audioReactive && isAudioLive) ? liveVocalEnergy : 0.0
    property bool transientHit: (audioReactive && isAudioLive) ? liveTransient : false

    toolTipMainText: i18n("Regel Visualizer")
    toolTipSubText: isAudioLive
        ? i18n("Playing: %1 (Live Audio)", conceptNames[activeConcept - 1])
        : i18n("Idle: %1", conceptNames[activeConcept - 1])

    function syncDaemonSettings() {
        try {
            PlasmaDBus.SessionBus.asyncCall({
                service: "org.regel.Audio",
                path: "/org/regel/Audio",
                iface: "org.regel.Audio",
                member: "SetSource",
                arguments: [root.configuredAudioSource]
            }, function() {}, function() {});

            PlasmaDBus.SessionBus.asyncCall({
                service: "org.regel.Audio",
                path: "/org/regel/Audio",
                iface: "org.regel.Audio",
                member: "SetAutoGain",
                arguments: [root.configuredAudioAutoGain]
            }, function() {}, function() {});

            PlasmaDBus.SessionBus.asyncCall({
                service: "org.regel.Audio",
                path: "/org/regel/Audio",
                iface: "org.regel.Audio",
                member: "SetGain",
                arguments: [root.configuredAudioGain]
            }, function() {}, function() {});
        } catch (e) {
        }
    }

    onConfiguredAudioSourceChanged: syncDaemonSettings()
    onConfiguredAudioAutoGainChanged: syncDaemonSettings()
    onConfiguredAudioGainChanged: syncDaemonSettings()

    Component.onCompleted: syncDaemonSettings()

    Timer {
        id: syncRetryTimer
        interval: 1000
        repeat: false
        running: true
        onTriggered: root.syncDaemonSettings()
    }

    // Simulation frame timer
    Timer {
        interval: 16
        running: true
        repeat: true
        onTriggered: root.simTime += 0.016
    }

    compactRepresentation: CompactRepresentation {
        plasmoidItem: root
        bass: root.bass
        mids: root.mids
        treble: root.treble
        isAudioLive: root.isAudioLive
    }

    fullRepresentation: FullRepresentation {
        plasmoidItem: root
    }
}
