import QtQuick
import org.kde.plasma.plasmoid
import org.kde.plasma.workspace.dbus as PlasmaDBus
import org.kde.plasma.wallpapers.image as PlasmaWallpaper
import org.kde.kwindowsystem
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

    // D-Bus IPC connection to regel-daemon (Session Bus)
    PlasmaDBus.Properties {
        id: audioProps
        service: "org.regel.Audio"
        path: "/org/regel/Audio"
        iface: "org.regel.Audio"
        busType: PlasmaDBus.BusType.Session
    }

    // UPower battery monitoring on System Bus
    PlasmaDBus.Properties {
        id: upowerProps
        service: "org.freedesktop.UPower"
        path: "/org/freedesktop/UPower"
        iface: "org.freedesktop.UPower"
        busType: PlasmaDBus.BusType.System
    }

    readonly property bool isOnBattery: upowerProps.properties && upowerProps.properties.OnBattery === true

    property real simTime: 0.0
    property point pointerPos: Qt.point(0.5, 0.5)
    property point pointerVel: Qt.point(0.0, 0.0)
    property bool pointerValid: false

    // Configuration bindings
    property int activeConcept: (wallpaperRoot.configuration && wallpaperRoot.configuration.activeConcept) ? wallpaperRoot.configuration.activeConcept : 1
    property real globalVortexSpeed: (wallpaperRoot.configuration && wallpaperRoot.configuration.vortexSpeed) ? wallpaperRoot.configuration.vortexSpeed : 0.8
    property bool audioReactive: (wallpaperRoot.configuration && typeof wallpaperRoot.configuration.audioReactive !== "undefined") ? wallpaperRoot.configuration.audioReactive : true
    property string configuredAudioSource: (wallpaperRoot.configuration && wallpaperRoot.configuration.audioSource) ? wallpaperRoot.configuration.audioSource : "monitor"
    property bool configuredAudioAutoGain: (wallpaperRoot.configuration && typeof wallpaperRoot.configuration.audioAutoGain !== "undefined") ? wallpaperRoot.configuration.audioAutoGain : true
    property real configuredAudioGain: (wallpaperRoot.configuration && typeof wallpaperRoot.configuration.audioGain !== "undefined") ? wallpaperRoot.configuration.audioGain : 3.5

    // Power & Performance Configuration
    property bool pauseWhenOccluded: (wallpaperRoot.configuration && typeof wallpaperRoot.configuration.pauseWhenOccluded === "boolean") ? wallpaperRoot.configuration.pauseWhenOccluded : true
    property int configuredTargetFramerate: (wallpaperRoot.configuration && typeof wallpaperRoot.configuration.targetFramerate === "number") ? wallpaperRoot.configuration.targetFramerate : 30
    property real configuredResolutionScale: (wallpaperRoot.configuration && typeof wallpaperRoot.configuration.resolutionScale === "number") ? wallpaperRoot.configuration.resolutionScale : 0.75
    property bool batterySaverEnabled: (wallpaperRoot.configuration && typeof wallpaperRoot.configuration.batterySaver === "boolean") ? wallpaperRoot.configuration.batterySaver : true

    // Context-Aware Occlusion Evaluation (Wallpaper vs Lockscreen vs ShowingDesktop)
    readonly property rect desktopRect: Window.window && Window.window.screen
        ? Qt.rect(Window.window.screen.virtualX, Window.window.screen.virtualY, Window.window.width, Window.window.height)
        : (Window.window ? Qt.rect(Window.window.x, Window.window.y, Window.window.width, Window.window.height) : Qt.rect(0, 0, width, height))

    PlasmaWallpaper.MaximizedWindowMonitor {
        id: activeWindowMonitor
        regionGeometry: wallpaperRoot.desktopRect
    }

    readonly property bool isWallpaperOccluded: pauseWhenOccluded && (
        KWindowSystem.isLocked || (activeWindowMonitor.count > 0 && !KWindowSystem.showingDesktop)
    )

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

    // --- Concept 9 Parameters ---
    property int concept9PaletteIdx: (wallpaperRoot.configuration && typeof wallpaperRoot.configuration.concept9Palette === "number") ? wallpaperRoot.configuration.concept9Palette : 0
    readonly property var currentGlyphPalette: palettes.glyphPalettes[concept9PaletteIdx % palettes.glyphPalettes.length]
    property real glyphScrollSpeed: (wallpaperRoot.configuration && typeof wallpaperRoot.configuration.glyphScrollSpeed === "number") ? wallpaperRoot.configuration.glyphScrollSpeed : 1.2
    property real glyphEmbossDepth: (wallpaperRoot.configuration && typeof wallpaperRoot.configuration.glyphEmbossDepth === "number") ? wallpaperRoot.configuration.glyphEmbossDepth : 1.0
    property bool glyphAutoCycleThemes: (wallpaperRoot.configuration && typeof wallpaperRoot.configuration.glyphAutoCycleThemes === "boolean") ? wallpaperRoot.configuration.glyphAutoCycleThemes : true
    property real glyphCycleInterval: (wallpaperRoot.configuration && typeof wallpaperRoot.configuration.glyphCycleInterval === "number") ? wallpaperRoot.configuration.glyphCycleInterval : 24.0
    property real glyphHoloStrength: (wallpaperRoot.configuration && typeof wallpaperRoot.configuration.glyphHoloStrength === "number") ? wallpaperRoot.configuration.glyphHoloStrength : 1.0
    property int glyphTextSourceMode: (wallpaperRoot.configuration && typeof wallpaperRoot.configuration.glyphTextSourceMode === "number") ? wallpaperRoot.configuration.glyphTextSourceMode : 0
    property string glyphTextCommand: (wallpaperRoot.configuration && typeof wallpaperRoot.configuration.glyphTextCommand === "string") ? wallpaperRoot.configuration.glyphTextCommand : "/usr/games/fortune -s"
    property string glyphCustomText: (wallpaperRoot.configuration && typeof wallpaperRoot.configuration.glyphCustomText === "string") ? wallpaperRoot.configuration.glyphCustomText : "The moving finger writes; and, having writ, moves on."
    property real glyphSpacing: (wallpaperRoot.configuration && typeof wallpaperRoot.configuration.glyphSpacing === "number") ? wallpaperRoot.configuration.glyphSpacing : 1.2
    property real glyphZoom: (wallpaperRoot.configuration && typeof wallpaperRoot.configuration.glyphZoom === "number") ? wallpaperRoot.configuration.glyphZoom : 1.0
    property real glyphHoloMode: (wallpaperRoot.configuration && typeof wallpaperRoot.configuration.glyphHoloMode === "number") ? wallpaperRoot.configuration.glyphHoloMode : 1.0

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
    property string liveFortune: (audioProps.properties && typeof audioProps.properties.fortune === "string") ? audioProps.properties.fortune : ""

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

    // Silence and Inactivity Detection
    property real silenceDuration: 0.0
    readonly property bool isAudioSilent: !isAudioLive || (liveRms < 0.005 && !liveTransient && liveBass < 0.02)
    readonly property bool isPointerStill: wallpaperRoot.pointerVel.x === 0.0 && wallpaperRoot.pointerVel.y === 0.0
    readonly property bool isQuietState: isAudioSilent && isPointerStill && silenceDuration >= 5.0

    // Dynamic framerate selection (60 FPS = 16ms, 30 FPS = 33ms, 20 FPS = 50ms, 15 FPS = 66ms)
    property int activeFramerate: (isOnBattery && batterySaverEnabled)
        ? (isQuietState ? 15 : 20)
        : (isQuietState ? 15 : configuredTargetFramerate)

    property int activeInterval: activeFramerate <= 15 ? 66 : (activeFramerate <= 20 ? 50 : (activeFramerate <= 30 ? 33 : 16))

    // Simulation frame timer & dynamic dt accumulation
    Timer {
        id: simTimer
        interval: wallpaperRoot.activeInterval
        running: !wallpaperRoot.isWallpaperOccluded
        repeat: true
        onTriggered: {
            let dt = interval / 1000.0
            wallpaperRoot.simTime += dt

            if (isAudioSilent && isPointerStill) {
                silenceDuration = Math.min(10.0, silenceDuration + dt)
            } else {
                silenceDuration = 0.0
            }

            if (wallpaperRoot.pointerVel.x !== 0.0 || wallpaperRoot.pointerVel.y !== 0.0) {
                let decay = Math.pow(0.82, dt / 0.016)
                let vx = wallpaperRoot.pointerVel.x * decay
                let vy = wallpaperRoot.pointerVel.y * decay
                if (Math.abs(vx) < 0.0005 && Math.abs(vy) < 0.0005) {
                    vx = 0.0
                    vy = 0.0
                }
                wallpaperRoot.pointerVel = Qt.point(vx, vy)
            }
        }
    }

    readonly property var conceptFiles: [
        "LiquidNeonAbyss.qml",
        "LivingPetriDish.qml",
        "TranquilKoiSanctuary.qml",
        "CosmicGravitationalSandbox.qml",
        "SynthwaveMegacity.qml",
        "RealtimeEphemerisBiome.qml",
        "KineticSpiderwebHarp.qml",
        "AnalogTelemetryConsole.qml",
        "EmbossedGlyphMatrix.qml"
    ]

    // Complete property forwarding contract for active archetype
    function applyArchetypeProperties(target) {
        if (!target) return;

        // 1. Universal Uniforms
        target.simTime = Qt.binding(() => wallpaperRoot.simTime);
        target.bass = Qt.binding(() => wallpaperRoot.bass);
        target.mids = Qt.binding(() => wallpaperRoot.mids);
        target.treble = Qt.binding(() => wallpaperRoot.treble);
        target.bpm = Qt.binding(() => wallpaperRoot.bpm);
        target.beat = Qt.binding(() => wallpaperRoot.beat);
        target.downbeat = Qt.binding(() => wallpaperRoot.downbeat);
        target.beatPhase = Qt.binding(() => wallpaperRoot.beatPhase);
        target.isVocal = Qt.binding(() => wallpaperRoot.isVocal);
        target.vocalEnergy = Qt.binding(() => wallpaperRoot.vocalEnergy);
        target.transientHit = Qt.binding(() => wallpaperRoot.transientHit);
        target.pointerPos = Qt.binding(() => wallpaperRoot.pointerPos);
        target.pointerVel = Qt.binding(() => wallpaperRoot.pointerVel);
        target.vortexSpeed = Qt.binding(() => wallpaperRoot.globalVortexSpeed);

        // 2. Archetype-Specific Specializations & Palettes
        switch (wallpaperRoot.activeConcept) {
            case 1:
                target.colorBg = Qt.binding(() => wallpaperRoot.currentFluidPalette.bg);
                target.colorDye1 = Qt.binding(() => wallpaperRoot.currentFluidPalette.dye1);
                target.colorDye2 = Qt.binding(() => wallpaperRoot.currentFluidPalette.dye2);
                target.colorDye3 = Qt.binding(() => wallpaperRoot.currentFluidPalette.dye3);
                break;
            case 2:
                target.apertureMode = Qt.binding(() => wallpaperRoot.petriAperture ? 1.0 : 0.0);
                target.colorBg = Qt.binding(() => wallpaperRoot.currentPetriPalette.bg);
                target.colorMembrane = Qt.binding(() => wallpaperRoot.currentPetriPalette.membrane);
                target.colorOrganelle = Qt.binding(() => wallpaperRoot.currentPetriPalette.organelle);
                target.colorGlow = Qt.binding(() => wallpaperRoot.currentPetriPalette.glow);
                break;
            case 3:
                target.waterClarity = Qt.binding(() => wallpaperRoot.koiWaterClarity);
                target.colorWater = Qt.binding(() => wallpaperRoot.currentKoiPalette.water);
                target.colorPebbles = Qt.binding(() => wallpaperRoot.currentKoiPalette.pebbles);
                target.colorCaustics = Qt.binding(() => wallpaperRoot.currentKoiPalette.caustics);
                target.colorAccent = Qt.binding(() => wallpaperRoot.currentKoiPalette.accent);
                break;
            case 4:
                target.lensStrength = Qt.binding(() => wallpaperRoot.cosmicLensStrength);
                target.autoHyperspace = Qt.binding(() => wallpaperRoot.cosmicAutoCycle);
                target.colorCore = Qt.binding(() => wallpaperRoot.currentCosmicPalette.core);
                target.colorDisk = Qt.binding(() => wallpaperRoot.currentCosmicPalette.disk);
                target.colorJets = Qt.binding(() => wallpaperRoot.currentCosmicPalette.jets);
                target.colorNebula = Qt.binding(() => wallpaperRoot.currentCosmicPalette.nebula);
                break;
            case 5:
                target.rainDensity = Qt.binding(() => wallpaperRoot.cityRainDensity);
                target.fogDensity = Qt.binding(() => wallpaperRoot.cityFogDensity);
                target.colorSky = Qt.binding(() => wallpaperRoot.currentCityPalette.sky);
                target.colorNeon1 = Qt.binding(() => wallpaperRoot.currentCityPalette.neon1);
                target.colorNeon2 = Qt.binding(() => wallpaperRoot.currentCityPalette.neon2);
                target.colorGrid = Qt.binding(() => wallpaperRoot.currentCityPalette.grid);
                break;
            case 6:
                target.weatherMode = Qt.binding(() => wallpaperRoot.biomeWeatherMode);
                target.syncToSystemClock = Qt.binding(() => wallpaperRoot.biomeSyncClock);
                target.colorSky = Qt.binding(() => wallpaperRoot.currentBiomePalette.sky);
                target.colorFoliage = Qt.binding(() => wallpaperRoot.currentBiomePalette.foliage);
                target.colorSunMoon = Qt.binding(() => wallpaperRoot.currentBiomePalette.sunMoon);
                target.colorWisp = Qt.binding(() => wallpaperRoot.currentBiomePalette.wisp);
                break;
            case 7:
                target.dewDensity = Qt.binding(() => wallpaperRoot.harpDewDensity);
                target.tension = Qt.binding(() => wallpaperRoot.harpTension);
                target.colorSilk = Qt.binding(() => wallpaperRoot.currentHarpPalette.silk);
                target.colorDew = Qt.binding(() => wallpaperRoot.currentHarpPalette.dew);
                target.colorResonance = Qt.binding(() => wallpaperRoot.currentHarpPalette.resonance);
                target.colorVoid = Qt.binding(() => wallpaperRoot.currentHarpPalette.voidColor);
                break;
            case 8:
                target.subBass = Qt.binding(() => wallpaperRoot.subBass);
                target.rms = Qt.binding(() => wallpaperRoot.rms);
                target.colorChassis = Qt.binding(() => wallpaperRoot.currentConsolePalette.chassis);
                target.colorDial = Qt.binding(() => wallpaperRoot.currentConsolePalette.dial);
                target.colorBezel = Qt.binding(() => wallpaperRoot.currentConsolePalette.bezel);
                target.colorScope = Qt.binding(() => wallpaperRoot.currentConsolePalette.scope);
                target.colorNeedle = Qt.binding(() => wallpaperRoot.currentConsolePalette.needle);
                target.colorAccent = Qt.binding(() => wallpaperRoot.currentConsolePalette.accent);
                break;
            case 9:
                target.scrollSpeed = Qt.binding(() => wallpaperRoot.glyphScrollSpeed);
                target.embossDepth = Qt.binding(() => wallpaperRoot.glyphEmbossDepth);
                target.holoStrength = Qt.binding(() => wallpaperRoot.glyphHoloStrength);
                target.autoCycleThemes = Qt.binding(() => wallpaperRoot.glyphAutoCycleThemes);
                target.cycleInterval = Qt.binding(() => wallpaperRoot.glyphCycleInterval);
                target.textSourceMode = Qt.binding(() => wallpaperRoot.glyphTextSourceMode);
                target.textCommand = Qt.binding(() => wallpaperRoot.glyphTextCommand);
                target.customText = Qt.binding(() => wallpaperRoot.glyphCustomText);
                target.externalFortune = Qt.binding(() => wallpaperRoot.liveFortune);
                target.paletteIndex = Qt.binding(() => wallpaperRoot.concept9PaletteIdx);
                target.glyphSpacing = Qt.binding(() => wallpaperRoot.glyphSpacing);
                target.glyphZoom = Qt.binding(() => wallpaperRoot.glyphZoom);
                target.holoMode = Qt.binding(() => wallpaperRoot.glyphHoloMode);
                break;
        }
    }

    // Resolution Scaling Container with Offscreen FBO downsampling
    Item {
        id: renderContainer
        anchors.fill: parent
        visible: !wallpaperRoot.isWallpaperOccluded

        property real effectiveRenderScale: (wallpaperRoot.isOnBattery && wallpaperRoot.batterySaverEnabled)
            ? 0.50
            : wallpaperRoot.configuredResolutionScale

        // Downsampling is restricted to compute-heavy fragment shaders (Concepts 1, 4, 5)
        readonly property bool isHeavyShader: wallpaperRoot.activeConcept === 1 || 
                                              wallpaperRoot.activeConcept === 4 || 
                                              wallpaperRoot.activeConcept === 5

        readonly property real targetDpr: (Window.window && Window.window.screen) 
            ? Window.window.screen.devicePixelRatio 
            : (Screen.devicePixelRatio || 1.0)

        layer.enabled: effectiveRenderScale < 0.99 && isHeavyShader
        layer.smooth: true
        layer.textureSize: Qt.size(
            Math.max(320, Math.round(width * targetDpr * effectiveRenderScale)),
            Math.max(240, Math.round(height * targetDpr * effectiveRenderScale))
        )

        Loader {
            id: conceptLoader
            anchors.fill: parent
            asynchronous: true
            source: (wallpaperRoot.activeConcept >= 1 && wallpaperRoot.activeConcept <= 9)
                    ? Qt.resolvedUrl("../engine/" + wallpaperRoot.conceptFiles[wallpaperRoot.activeConcept - 1])
                    : ""

            onLoaded: {
                if (item) {
                    wallpaperRoot.applyArchetypeProperties(item)
                }
            }
        }
    }

    // Pointer tracker when cursor hovers over exposed desktop
    MouseArea {
        anchors.fill: parent
        hoverEnabled: true
        acceptedButtons: Qt.NoButton // Allows desktop icon clicks to pass through
        onEntered: {
            wallpaperRoot.pointerValid = false
        }
        onExited: {
            wallpaperRoot.pointerValid = false
            wallpaperRoot.pointerVel = Qt.point(0.0, 0.0)
        }
        onPositionChanged: (mouse) => {
            let curX = Math.max(0.0, Math.min(1.0, mouse.x / width))
            let curY = Math.max(0.0, Math.min(1.0, mouse.y / height))
            if (!wallpaperRoot.pointerValid) {
                wallpaperRoot.pointerValid = true
                wallpaperRoot.pointerPos = Qt.point(curX, curY)
                wallpaperRoot.pointerVel = Qt.point(0.0, 0.0)
                return
            }
            let rawDx = curX - wallpaperRoot.pointerPos.x
            let rawDy = curY - wallpaperRoot.pointerPos.y
            // Normalize velocity response across display resolutions (e.g. 4K vs 1080p)
            let refScale = Math.max(1.0, width / 1920.0)
            let clDx = Math.max(-0.25, Math.min(0.25, rawDx * refScale))
            let clDy = Math.max(-0.25, Math.min(0.25, rawDy * refScale))
            wallpaperRoot.pointerVel = Qt.point(wallpaperRoot.pointerVel.x * 0.3 + clDx * 0.7, wallpaperRoot.pointerVel.y * 0.3 + clDy * 0.7)
            wallpaperRoot.pointerPos = Qt.point(curX, curY)
        }
    }
}
