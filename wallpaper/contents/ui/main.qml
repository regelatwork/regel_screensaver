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

    Palettes {
        id: palettes
    }

    // --- Concept 1 Parameters ---
    property int concept1PaletteIdx: (wallpaperRoot.configuration && typeof wallpaperRoot.configuration.concept1Palette === "number") ? wallpaperRoot.configuration.concept1Palette : 0
    readonly property var currentFluidPalette: palettes.fluidPalettes[concept1PaletteIdx % palettes.fluidPalettes.length]

    // --- Concept 2 Parameters ---
    property int concept2PaletteIdx: (wallpaperRoot.configuration && typeof wallpaperRoot.configuration.concept2Palette === "number") ? wallpaperRoot.configuration.concept2Palette : 0
    readonly property var currentPetriPalette: palettes.petriPalettes[concept2PaletteIdx % palettes.petriPalettes.length]
    property bool petriAperture: (wallpaperRoot.configuration && typeof wallpaperRoot.configuration.petriAperture === "boolean") ? wallpaperRoot.configuration.petriAperture : false

    // --- Concept 3 Parameters ---
    property int concept3PaletteIdx: (wallpaperRoot.configuration && typeof wallpaperRoot.configuration.concept3Palette === "number") ? wallpaperRoot.configuration.concept3Palette : 0
    readonly property var currentKoiPalette: palettes.koiPalettes[concept3PaletteIdx % palettes.koiPalettes.length]
    property real koiWaterClarity: (wallpaperRoot.configuration && typeof wallpaperRoot.configuration.koiWaterClarity === "number") ? wallpaperRoot.configuration.koiWaterClarity : 1.0

    // --- Concept 4 Parameters ---
    property int concept4PaletteIdx: (wallpaperRoot.configuration && typeof wallpaperRoot.configuration.concept4Palette === "number") ? wallpaperRoot.configuration.concept4Palette : 0
    readonly property var currentCosmicPalette: palettes.cosmicPalettes[concept4PaletteIdx % palettes.cosmicPalettes.length]
    property real cosmicLensStrength: (wallpaperRoot.configuration && typeof wallpaperRoot.configuration.cosmicLensStrength === "number") ? wallpaperRoot.configuration.cosmicLensStrength : 1.0
    property bool cosmicAutoCycle: (wallpaperRoot.configuration && typeof wallpaperRoot.configuration.cosmicAutoCycle === "boolean") ? wallpaperRoot.configuration.cosmicAutoCycle : true

    // --- Concept 5 Parameters ---
    property int concept5PaletteIdx: (wallpaperRoot.configuration && typeof wallpaperRoot.configuration.concept5Palette === "number") ? wallpaperRoot.configuration.concept5Palette : 0
    readonly property var currentCityPalette: palettes.cityPalettes[concept5PaletteIdx % palettes.cityPalettes.length]
    property real cityRainDensity: (wallpaperRoot.configuration && typeof wallpaperRoot.configuration.cityRainDensity === "number") ? wallpaperRoot.configuration.cityRainDensity : 0.65
    property real cityFogDensity: (wallpaperRoot.configuration && typeof wallpaperRoot.configuration.cityFogDensity === "number") ? wallpaperRoot.configuration.cityFogDensity : 0.85

    // --- Concept 6 Parameters ---
    property int concept6PaletteIdx: (wallpaperRoot.configuration && typeof wallpaperRoot.configuration.concept6Palette === "number") ? wallpaperRoot.configuration.concept6Palette : 0
    readonly property var currentBiomePalette: palettes.biomePalettes[concept6PaletteIdx % palettes.biomePalettes.length]
    property real biomeWeatherMode: (wallpaperRoot.configuration && typeof wallpaperRoot.configuration.biomeWeatherMode === "number") ? wallpaperRoot.configuration.biomeWeatherMode : 0.0
    property bool biomeSyncClock: (wallpaperRoot.configuration && typeof wallpaperRoot.configuration.biomeSyncClock === "boolean") ? wallpaperRoot.configuration.biomeSyncClock : true

    // --- Concept 7 Parameters ---
    property int concept7PaletteIdx: (wallpaperRoot.configuration && typeof wallpaperRoot.configuration.concept7Palette === "number") ? wallpaperRoot.configuration.concept7Palette : 0
    readonly property var currentHarpPalette: palettes.harpPalettes[concept7PaletteIdx % palettes.harpPalettes.length]
    property real harpDewDensity: (wallpaperRoot.configuration && typeof wallpaperRoot.configuration.harpDewDensity === "number") ? wallpaperRoot.configuration.harpDewDensity : 0.75
    property real harpTension: (wallpaperRoot.configuration && typeof wallpaperRoot.configuration.harpTension === "number") ? wallpaperRoot.configuration.harpTension : 1.0

    // --- Concept 8 Parameters ---
    property int concept8PaletteIdx: (wallpaperRoot.configuration && typeof wallpaperRoot.configuration.concept8Palette === "number") ? wallpaperRoot.configuration.concept8Palette : 0
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
    property real liveBeatPhase: isAudioLive && typeof audioProps.properties.beat_phase === "number" ? audioProps.properties.beat_phase : 0.0

    // Active audio levels fed into visualizers
    property real subBass: (audioReactive && isAudioLive) ? liveSubBass : 0.05
    property real bass: (audioReactive && isAudioLive) ? liveBass : 0.08
    property real mids: (audioReactive && isAudioLive) ? liveMids : 0.05
    property real treble: (audioReactive && isAudioLive) ? liveTreble : 0.05
    property real rms: (audioReactive && isAudioLive) ? liveRms : 0.05
    property real bpm: (audioReactive && isAudioLive) ? liveBpm : 120.0
    property bool beat: (audioReactive && isAudioLive) ? liveBeat : false
    property bool downbeat: (audioReactive && isAudioLive) ? liveDownbeat : false
    property real beatPhase: (audioReactive && isAudioLive) ? liveBeatPhase : ((wallpaperRoot.simTime * (bpm / 60.0)) % 1.0)
    property bool isVocal: (audioReactive && isAudioLive) ? liveIsVocal : false
    property real vocalEnergy: (audioReactive && isAudioLive) ? liveVocalEnergy : 0.0
    property bool transientHit: (audioReactive && isAudioLive) ? liveTransient : false

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
        bpm: wallpaperRoot.bpm
        beat: wallpaperRoot.beat
        downbeat: wallpaperRoot.downbeat
        beatPhase: wallpaperRoot.beatPhase
        isVocal: wallpaperRoot.isVocal
        vocalEnergy: wallpaperRoot.vocalEnergy
        transientHit: wallpaperRoot.transientHit
        pointerPos: wallpaperRoot.pointerPos
        pointerVel: wallpaperRoot.pointerVel
        vortexSpeed: wallpaperRoot.globalVortexSpeed
        colorBg: wallpaperRoot.currentFluidPalette.bg
        colorDye1: wallpaperRoot.currentFluidPalette.dye1
        colorDye2: wallpaperRoot.currentFluidPalette.dye2
        colorDye3: wallpaperRoot.currentFluidPalette.dye3
    }

    // Concept 2: The Living Petri Dish (Lenia Continuous Artificial Life)
    LivingPetriDish {
        anchors.fill: parent
        visible: wallpaperRoot.activeConcept === 2
        simTime: wallpaperRoot.simTime
        bass: wallpaperRoot.bass
        mids: wallpaperRoot.mids
        treble: wallpaperRoot.treble
        bpm: wallpaperRoot.bpm
        beat: wallpaperRoot.beat
        downbeat: wallpaperRoot.downbeat
        beatPhase: wallpaperRoot.beatPhase
        isVocal: wallpaperRoot.isVocal
        vocalEnergy: wallpaperRoot.vocalEnergy
        transientHit: wallpaperRoot.transientHit
        pointerPos: wallpaperRoot.pointerPos
        pointerVel: wallpaperRoot.pointerVel
        vortexSpeed: wallpaperRoot.globalVortexSpeed
        apertureMode: wallpaperRoot.petriAperture ? 1.0 : 0.0
        colorBg: wallpaperRoot.currentPetriPalette.bg
        colorMembrane: wallpaperRoot.currentPetriPalette.membrane
        colorOrganelle: wallpaperRoot.currentPetriPalette.organelle
        colorGlow: wallpaperRoot.currentPetriPalette.glow
    }

    // Concept 3: The Tranquil Sanctuary (Caustic Koi Pond & Boid Ecosystem)
    TranquilKoiSanctuary {
        anchors.fill: parent
        visible: wallpaperRoot.activeConcept === 3
        simTime: wallpaperRoot.simTime
        bass: wallpaperRoot.bass
        mids: wallpaperRoot.mids
        treble: wallpaperRoot.treble
        bpm: wallpaperRoot.bpm
        beat: wallpaperRoot.beat
        downbeat: wallpaperRoot.downbeat
        beatPhase: wallpaperRoot.beatPhase
        isVocal: wallpaperRoot.isVocal
        vocalEnergy: wallpaperRoot.vocalEnergy
        transientHit: wallpaperRoot.transientHit
        pointerPos: wallpaperRoot.pointerPos
        pointerVel: wallpaperRoot.pointerVel
        vortexSpeed: wallpaperRoot.globalVortexSpeed
        waterClarity: wallpaperRoot.koiWaterClarity
        colorWater: wallpaperRoot.currentKoiPalette.water
        colorPebbles: wallpaperRoot.currentKoiPalette.pebbles
        colorCaustics: wallpaperRoot.currentKoiPalette.caustics
        colorAccent: wallpaperRoot.currentKoiPalette.accent
    }

    // Concept 4: Cosmic Gravitational Sandbox (Black Hole & Relativistic Jets)
    CosmicGravitationalSandbox {
        anchors.fill: parent
        visible: wallpaperRoot.activeConcept === 4
        simTime: wallpaperRoot.simTime
        bass: wallpaperRoot.bass
        mids: wallpaperRoot.mids
        treble: wallpaperRoot.treble
        bpm: wallpaperRoot.bpm
        beat: wallpaperRoot.beat
        downbeat: wallpaperRoot.downbeat
        beatPhase: wallpaperRoot.beatPhase
        isVocal: wallpaperRoot.isVocal
        vocalEnergy: wallpaperRoot.vocalEnergy
        transientHit: wallpaperRoot.transientHit
        pointerPos: wallpaperRoot.pointerPos
        pointerVel: wallpaperRoot.pointerVel
        vortexSpeed: wallpaperRoot.globalVortexSpeed
        lensStrength: wallpaperRoot.cosmicLensStrength
        autoHyperspace: wallpaperRoot.cosmicAutoCycle
        colorCore: wallpaperRoot.currentCosmicPalette.core
        colorDisk: wallpaperRoot.currentCosmicPalette.disk
        colorJets: wallpaperRoot.currentCosmicPalette.jets
        colorNebula: wallpaperRoot.currentCosmicPalette.nebula
    }

    // Concept 5: Procedural Synthwave Megacity (Cyberpunk Skyline & Raymarched Highway)
    SynthwaveMegacity {
        anchors.fill: parent
        visible: wallpaperRoot.activeConcept === 5
        simTime: wallpaperRoot.simTime
        bass: wallpaperRoot.bass
        mids: wallpaperRoot.mids
        treble: wallpaperRoot.treble
        bpm: wallpaperRoot.bpm
        beat: wallpaperRoot.beat
        downbeat: wallpaperRoot.downbeat
        beatPhase: wallpaperRoot.beatPhase
        isVocal: wallpaperRoot.isVocal
        vocalEnergy: wallpaperRoot.vocalEnergy
        transientHit: wallpaperRoot.transientHit
        pointerPos: wallpaperRoot.pointerPos
        pointerVel: wallpaperRoot.pointerVel
        vortexSpeed: wallpaperRoot.globalVortexSpeed
        rainDensity: wallpaperRoot.cityRainDensity
        fogDensity: wallpaperRoot.cityFogDensity
        colorSky: wallpaperRoot.currentCityPalette.sky
        colorNeon1: wallpaperRoot.currentCityPalette.neon1
        colorNeon2: wallpaperRoot.currentCityPalette.neon2
        colorGrid: wallpaperRoot.currentCityPalette.grid
    }

    // Concept 6: Real-Time Ephemeris Biome (Ghibli Weather Terrarium)
    RealtimeEphemerisBiome {
        anchors.fill: parent
        visible: wallpaperRoot.activeConcept === 6
        simTime: wallpaperRoot.simTime
        bass: wallpaperRoot.bass
        mids: wallpaperRoot.mids
        treble: wallpaperRoot.treble
        bpm: wallpaperRoot.bpm
        beat: wallpaperRoot.beat
        downbeat: wallpaperRoot.downbeat
        beatPhase: wallpaperRoot.beatPhase
        isVocal: wallpaperRoot.isVocal
        vocalEnergy: wallpaperRoot.vocalEnergy
        transientHit: wallpaperRoot.transientHit
        pointerPos: wallpaperRoot.pointerPos
        pointerVel: wallpaperRoot.pointerVel
        vortexSpeed: wallpaperRoot.globalVortexSpeed
        weatherMode: wallpaperRoot.biomeWeatherMode
        syncToSystemClock: wallpaperRoot.biomeSyncClock
        colorSky: wallpaperRoot.currentBiomePalette.sky
        colorFoliage: wallpaperRoot.currentBiomePalette.foliage
        colorSunMoon: wallpaperRoot.currentBiomePalette.sunMoon
        colorWisp: wallpaperRoot.currentBiomePalette.wisp
    }

    // Concept 7: Kinetic Spiderweb & Resonance Harp (Tactile Elastic Lattice)
    KineticSpiderwebHarp {
        anchors.fill: parent
        visible: wallpaperRoot.activeConcept === 7
        simTime: wallpaperRoot.simTime
        bass: wallpaperRoot.bass
        mids: wallpaperRoot.mids
        treble: wallpaperRoot.treble
        bpm: wallpaperRoot.bpm
        beat: wallpaperRoot.beat
        downbeat: wallpaperRoot.downbeat
        beatPhase: wallpaperRoot.beatPhase
        isVocal: wallpaperRoot.isVocal
        vocalEnergy: wallpaperRoot.vocalEnergy
        transientHit: wallpaperRoot.transientHit
        pointerPos: wallpaperRoot.pointerPos
        pointerVel: wallpaperRoot.pointerVel
        vortexSpeed: wallpaperRoot.globalVortexSpeed
        dewDensity: wallpaperRoot.harpDewDensity
        tension: wallpaperRoot.harpTension
        colorSilk: wallpaperRoot.currentHarpPalette.silk
        colorDew: wallpaperRoot.currentHarpPalette.dew
        colorResonance: wallpaperRoot.currentHarpPalette.resonance
        colorVoid: wallpaperRoot.currentHarpPalette.voidColor
    }

    // Concept 8: The Analog Telemetry Console (Ballistic Galvanometers & P1 Phosphor CRT)
    AnalogTelemetryConsole {
        anchors.fill: parent
        visible: wallpaperRoot.activeConcept === 8
        simTime: wallpaperRoot.simTime
        subBass: wallpaperRoot.subBass
        bass: wallpaperRoot.bass
        mids: wallpaperRoot.mids
        treble: wallpaperRoot.treble
        rms: wallpaperRoot.rms
        bpm: wallpaperRoot.bpm
        beat: wallpaperRoot.beat
        downbeat: wallpaperRoot.downbeat
        beatPhase: wallpaperRoot.beatPhase
        isVocal: wallpaperRoot.isVocal
        vocalEnergy: wallpaperRoot.vocalEnergy
        transientHit: wallpaperRoot.transientHit
        pointerPos: wallpaperRoot.pointerPos
        pointerVel: wallpaperRoot.pointerVel
        colorChassis: wallpaperRoot.currentConsolePalette.chassis
        colorDial: wallpaperRoot.currentConsolePalette.dial
        colorBezel: wallpaperRoot.currentConsolePalette.bezel
        colorScope: wallpaperRoot.currentConsolePalette.scope
        colorNeedle: wallpaperRoot.currentConsolePalette.needle
        colorAccent: wallpaperRoot.currentConsolePalette.accent
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
