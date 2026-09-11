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

    readonly property bool hasEngine: typeof engineCore !== "undefined" && engineCore !== null

    // --- State Properties bound to native Rust regel-engine ---
    property real simTime: hasEngine ? engineCore.simTime : 0.0
    property real keystrokeEnergy: hasEngine ? engineCore.keystrokeEnergy : 0.0
    property real shockwaveIntensity: hasEngine ? engineCore.shockwaveIntensity : 0.0
    property real vortexSpeed: hasEngine ? engineCore.vortexSpeed : 1.0
    property real subBass: hasEngine ? engineCore.subBass : 0.08
    property real bass: hasEngine ? engineCore.bass : 0.12
    property real mids: hasEngine ? engineCore.mids : 0.05
    property real treble: hasEngine ? engineCore.treble : 0.05
    property point pointerPos: hasEngine ? engineCore.pointerPos : Qt.point(0.5, 0.5)
    property point pointerVel: hasEngine ? engineCore.pointerVel : Qt.point(0.0, 0.0)
    property point pointerMomentum: hasEngine ? engineCore.pointerMomentum : Qt.point(0.0, 0.0)
    property point ambientDrift: hasEngine ? engineCore.ambientDrift : Qt.point(0.0, 0.0)
    property point beatCenter: hasEngine ? engineCore.beatCenter : Qt.point(0.5, 0.5)
    property point keystrokePos: hasEngine ? engineCore.keystrokePos : Qt.point(0.5, 0.5)
    property point keystrokeDir: hasEngine ? engineCore.keystrokeDir : Qt.point(0.0, 1.0)
    property string sessionState: hasEngine ? engineCore.sessionState : "Active"

    property int selectedConcept: 1
    property bool lockscreenMode: false
    property int wallpaperModeCycle: 0

    // Concept 1 Palettes (Fluid Abyss)
    readonly property var fluidPalettes: [
        { name: "Cyber Neon (Default)",        bg: "#02040a", dye1: "#00d4ff", dye2: "#ff007f", dye3: "#ffaa00" },
        { name: "Bioluminescent Abyssal",      bg: "#01080e", dye1: "#00ffa3", dye2: "#00c8ff", dye3: "#a855f7" },
        { name: "Solar Flare / Magma",         bg: "#0d0402", dye1: "#ff9900", dye2: "#ff2200", dye3: "#ffffff" },
        { name: "Quicksilver Metal",           bg: "#08080a", dye1: "#e2e8f0", dye2: "#94a3b8", dye3: "#38bdf8" },
        { name: "Nordic Aurora",               bg: "#020712", dye1: "#10b981", dye2: "#06b6d4", dye3: "#ec4899" }
    ]

    // Concept 2 Palettes (Living Petri Dish)
    readonly property var petriPalettes: [
        { name: "Deep Sea Abyssal (Cyan/Emerald)",   bg: "#01080e", dye1: "#00d4ff", dye2: "#00ffa3", dye3: "#a855f7" },
        { name: "Bioluminescent Phytoplankton",      bg: "#020d10", dye1: "#00ffa3", dye2: "#ffcc00", dye3: "#00e5ff" },
        { name: "Solar Extremophile (Thermal Vent)", bg: "#0d0402", dye1: "#ff5500", dye2: "#ffcc00", dye3: "#ff0044" },
        { name: "Ethereal Ghost Amoeba",             bg: "#080a0f", dye1: "#e2e8f0", dye2: "#38bdf8", dye3: "#818cf8" },
        { name: "Coral Reef UV Excitation",          bg: "#0a0212", dye1: "#ec4899", dye2: "#a3e635", dye3: "#06b6d4" }
    ]

    // Concept 3 Palettes (The Tranquil Sanctuary - Koi Pond)
    readonly property var koiPalettes: [
        { name: "Spring Sakura (Aqua & Cherry Blossom)",    bg: "#083344", dye1: "#64748b", dye2: "#e0f2fe", dye3: "#f472b6" },
        { name: "Kyoto Moss Garden (Jade & Granite)",       bg: "#052e16", dye1: "#475569", dye2: "#bbf7d0", dye3: "#f59e0b" },
        { name: "Twilight Fireflies (Midnight & Gold)",      bg: "#0f172a", dye1: "#334155", dye2: "#93c5fd", dye3: "#fbbf24" },
        { name: "Autumn Maple (Deep Tea & Fallen Red)",     bg: "#1c1917", dye1: "#57534e", dye2: "#fed7aa", dye3: "#ef4444" },
        { name: "Sumi-e Monochrome (Zen Charcoal & Pearl)", bg: "#09090b", dye1: "#27272a", dye2: "#f4f4f5", dye3: "#e4e4e7" }
    ]

    // Concept 4 Palettes (Cosmic Gravitational Sandbox)
    readonly property var cosmicPalettes: [
        { name: "Sagittarius A* (Supermassive Singularity)", bg: "#0f172a", dye1: "#38bdf8", dye2: "#f97316", dye3: "#a855f7" },
        { name: "M87* (Supergiant Elliptical Shadow)",       bg: "#18181b", dye1: "#fef08a", dye2: "#ea580c", dye3: "#6366f1" },
        { name: "Cygnus X-1 (Stellar Microquasar)",          bg: "#030712", dye1: "#67e8f9", dye2: "#2563eb", dye3: "#ec4899" },
        { name: "Magnetar SGR 1806-20 (Ultra-Magnetic)",     bg: "#042f2e", dye1: "#a7f3d0", dye2: "#059669", dye3: "#f43f5e" },
        { name: "Gargantua (Kerr Extreme Horizon)",          bg: "#09090b", dye1: "#ffffff", dye2: "#eab308", dye3: "#8b5cf6" },
        { name: "Blazar 3C 273 (Relativistic Jet Alignment)", bg: "#1e1b4b", dye1: "#f472b6", dye2: "#fb923c", dye3: "#38bdf8" }
    ]

    // Concept 5 Palettes (Procedural Synthwave Megacity)
    readonly property var cityPalettes: [
        { name: "Neo-Tokyo Outrun (Cyber Cyan & Hot Magenta)", bg: "#180c2e", dye1: "#06b6d4", dye2: "#ec4899", dye3: "#8b5cf6" },
        { name: "Blade Runner 2049 (Amber Smog & Deep Cyan)",  bg: "#1c1917", dye1: "#38bdf8", dye2: "#f59e0b", dye3: "#ea580c" },
        { name: "Matrix Phosphor (Terminal Emerald & Mint)",    bg: "#022c22", dye1: "#34d399", dye2: "#10b981", dye3: "#059669" },
        { name: "Syndicate Blood (Crimson Hazard & Gold)",     bg: "#1a050b", dye1: "#ef4444", dye2: "#facc15", dye3: "#dc2626" },
        { name: "Retrowave Sunset (Electric Purple & Coral)",  bg: "#2e1065", dye1: "#a855f7", dye2: "#fb923c", dye3: "#f43f5e" }
    ]

    // Concept 6 Palettes (Real-Time Ephemeris Biome)
    readonly property var biomePalettes: [
        { name: "Yakushima Ancient Forest (Ghibli Emerald & Gold)", sky: "#0f172a", dye1: "#15803d", dye2: "#fde047", dye3: "#facc15" },
        { name: "Sakura Spring Dawn (Cherry Blossom & Lavender)",   sky: "#1e1b4b", dye1: "#f472b6", dye2: "#fda4af", dye3: "#f43f5e" },
        { name: "Autumn Koyo Harvest (Crimson Maple & Amber)",      sky: "#1c1917", dye1: "#dc2626", dye2: "#f97316", dye3: "#fbbf24" },
        { name: "Alpine Winter Twilight (Cobalt Frost & Snow)",     sky: "#020617", dye1: "#38bdf8", dye2: "#e0f2fe", dye3: "#67e8f9" },
        { name: "Midnight Bioluminescence (Obsidian & Jade)",       sky: "#030712", dye1: "#10b981", dye2: "#a7f3d0", dye3: "#34d399" }
    ]

    property int selectedPalette: 0
    readonly property var currentPalettes: selectedConcept === 6 ? biomePalettes : (selectedConcept === 5 ? cityPalettes : (selectedConcept === 4 ? cosmicPalettes : (selectedConcept === 3 ? koiPalettes : (selectedConcept === 2 ? petriPalettes : fluidPalettes))))
    property color activeBg: currentPalettes[selectedPalette % currentPalettes.length].bg
    property color activeDye1: currentPalettes[selectedPalette % currentPalettes.length].dye1
    property color activeDye2: currentPalettes[selectedPalette % currentPalettes.length].dye2
    property color activeDye3: currentPalettes[selectedPalette % currentPalettes.length].dye3
    property bool petriCircularAperture: true

    function updateAudioParams() {
        if (typeof liveAudio !== "undefined" && typeof liveAudio.setSensitivity === "function") {
            let gain = (typeof sldGain !== "undefined") ? sldGain.value : 4.0
            let gamma = (typeof sldGamma !== "undefined") ? sldGamma.value : 0.45
            let autoGain = (typeof chkAutoGain !== "undefined") ? chkAutoGain.checked : true
            liveAudio.setSensitivity(gain, gamma, autoGain)
        }
    }

    // Simulation Frame Loop (60 Hz) driving Rust EngineCore
    Timer {
        interval: 16
        running: true
        repeat: true
        onTriggered: {
            if (radAudioBeat.checked && hasEngine) {
                // Synthesize rhythmic beat pulse and forward to Rust engine
                let beatPhase = (root.simTime * 2.0) % 1.0
                let b = (beatPhase < 0.1) ? 0.85 : Math.max(0.08, root.bass * 0.92)
                let sb = (beatPhase < 0.1) ? 0.70 : Math.max(0.05, root.subBass * 0.94)
                engineCore.setAudio(sb, b, 0.05, 0.05, (b + sb) * 0.5, beatPhase < 0.1)
            }

            if (hasEngine) {
                engineCore.tick(0.016)
            }
        }
    }

    // Global Key Steering for Oceanic Currents
    Item {
        anchors.fill: parent
        focus: true

        Keys.onPressed: (event) => {
            let handled = false
            if (event.key === Qt.Key_Up) {
                if (hasEngine) engineCore.steerCurrent(0.0, -0.08)
                handled = true
            } else if (event.key === Qt.Key_Down) {
                if (hasEngine) engineCore.steerCurrent(0.0, 0.08)
                handled = true
            } else if (event.key === Qt.Key_Left) {
                if (hasEngine) engineCore.steerCurrent(-0.08, 0.0)
                handled = true
            } else if (event.key === Qt.Key_Right) {
                if (hasEngine) engineCore.steerCurrent(0.08, 0.0)
                handled = true
            }
            if (handled) {
                event.accepted = true
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

        // Concept 2: The Living Petri Dish (Lenia & Continuous Artificial Life)
        LivingPetriDish {
            anchors.fill: parent
            visible: root.selectedConcept === 2
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
            colorMembrane: root.activeDye1
            colorOrganelle: root.activeDye2
            colorGlow: root.activeDye3
            apertureMode: root.petriCircularAperture ? 1.0 : 0.0
        }

        // Concept 3: The Tranquil Sanctuary (Caustic Koi Pond & Boid Ecosystem)
        TranquilKoiSanctuary {
            anchors.fill: parent
            visible: root.selectedConcept === 3
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
            colorWater: root.activeBg
            colorPebbles: root.activeDye1
            colorCaustics: root.activeDye2
            colorAccent: root.activeDye3
            waterClarity: 1.0
        }

        // Concept 4: Cosmic Gravitational Sandbox (Black Hole & Relativistic Jets)
        CosmicGravitationalSandbox {
            id: cosmicSandbox
            anchors.fill: parent
            visible: root.selectedConcept === 4
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
            lensStrength: 1.0
            onHyperspaceJumped: (objName, objIdx) => {
                if (root.selectedConcept === 4) {
                    root.selectedPalette = objIdx % root.currentPalettes.length
                    cmbPalette.currentIndex = root.selectedPalette
                }
            }
        }

        // Concept 5: Procedural Synthwave Megacity (Cyberpunk Skyline & Raymarched Highway)
        SynthwaveMegacity {
            id: citySandbox
            anchors.fill: parent
            visible: root.selectedConcept === 5
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
            colorSky: root.activeBg
            colorNeon1: root.activeDye1
            colorNeon2: root.activeDye2
            colorGrid: root.activeDye3
            searchlightPower: (typeof sldDroneLight !== "undefined") ? sldDroneLight.value : 1.0
            rainDensity: (typeof chkRain !== "undefined" && chkRain.checked) ? 0.75 : 0.0
            fogDensity: (typeof sldSmog !== "undefined") ? sldSmog.value : 0.85
        }

        // Concept 6: Real-Time Ephemeris Biome (Ghibli Weather Terrarium)
        RealtimeEphemerisBiome {
            id: biomeSandbox
            anchors.fill: parent
            visible: root.selectedConcept === 6
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
            colorSky: root.activeBg
            colorFoliage: root.activeDye1
            colorSunMoon: root.activeDye2
            colorWisp: root.activeDye3
            syncToSystemClock: (typeof chkClockSync !== "undefined") ? chkClockSync.checked : true
            solarTime: (typeof chkClockSync !== "undefined" && chkClockSync.checked) ? biomeSandbox.solarTime : ((typeof sldSolarTime !== "undefined") ? sldSolarTime.value : 14.5)
            weatherMode: (typeof cmbWeather !== "undefined") ? cmbWeather.currentIndex : 0.0
            lunarPhase: (typeof sldMoonPhase !== "undefined") ? sldMoonPhase.value : 0.5
            fogDensity: (typeof sldValleyFog !== "undefined") ? sldValleyFog.value : 0.5
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

        // Interactive MouseArea forwarding input directly to Rust engine
        MouseArea {
            anchors.fill: parent
            hoverEnabled: true
            property real lastX: 0.5
            property real lastY: 0.5

            onPositionChanged: (mouse) => {
                let curX = mouse.x / canvasArea.width
                let curY = mouse.y / canvasArea.height
                let dx = curX - lastX
                let dy = curY - lastY
                lastX = curX
                lastY = curY

                if (hasEngine) {
                    engineCore.pointerMove(curX, curY, dx, dy)
                }
            }
            onPressed: (mouse) => {
                let curX = mouse.x / canvasArea.width
                let curY = mouse.y / canvasArea.height
                if (hasEngine) {
                    engineCore.pointerClick(curX, curY, mouse.button)
                }
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

                // Concept Selector
                RowLayout {
                    Layout.fillWidth: true
                    Text { text: "Concept:"; color: "#94a3b8"; font.bold: true }
                    ComboBox {
                        id: cmbConcept
                        Layout.fillWidth: true
                        model: [
                            "1: Liquid Neon Abyss",
                            "2: The Living Petri Dish (Lenia)",
                            "3: The Tranquil Sanctuary (Koi Pond)",
                            "4: Cosmic Gravitational Sandbox (Black Hole)",
                            "5: Procedural Synthwave Megacity (Cyberpunk Skyline)",
                            "6: Real-Time Ephemeris Biome (Ghibli Weather Terrarium)"
                        ]
                        currentIndex: root.selectedConcept - 1
                        onActivated: (idx) => {
                            root.selectedConcept = idx + 1
                            root.selectedPalette = 0
                            cmbPalette.currentIndex = 0
                        }
                    }
                }

                // Palette Selector
                RowLayout {
                    Layout.fillWidth: true
                    Text { text: "Palette:"; color: "#94a3b8"; font.bold: true }
                    ComboBox {
                        id: cmbPalette
                        Layout.fillWidth: true
                        model: {
                            let names = []
                            for (let i = 0; i < root.currentPalettes.length; i++) {
                                names.push(root.currentPalettes[i].name)
                            }
                            return names
                        }
                        currentIndex: root.selectedPalette
                        onActivated: (idx) => {
                            root.selectedPalette = idx
                            if (root.selectedConcept === 4 && typeof cosmicSandbox !== "undefined") {
                                cosmicSandbox.setAstronomicalObject(idx)
                            }
                        }
                    }
                }

                // Concept 2 Microscope Slide Aperture Toggle
                RowLayout {
                    Layout.fillWidth: true
                    visible: root.selectedConcept === 2
                    Text { text: "Microscope Slide Aperture:"; color: "#cbd5e1" }
                    Switch {
                        checked: root.petriCircularAperture
                        onToggled: root.petriCircularAperture = checked
                    }
                }

                // Concept 4 Hyperspace Jump & Anti-Ghosting Controls
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 6
                    visible: root.selectedConcept === 4

                    RowLayout {
                        Layout.fillWidth: true
                        Text { text: "Hyperspace Navigation:"; color: "#cbd5e1" }
                        Item { Layout.fillWidth: true }
                        Rectangle {
                            width: lblSec.width + 14
                            height: 20
                            radius: 10
                            color: (typeof cosmicSandbox !== "undefined" && cosmicSandbox.hyperspacePhase > 0.0) ? "#0284c7" : ((typeof cosmicSandbox !== "undefined" && cosmicSandbox.secondsRemaining <= 5) ? "#b91c1c" : "#1e293b")
                            border.color: (typeof cosmicSandbox !== "undefined" && cosmicSandbox.hyperspacePhase > 0.0) ? "#38bdf8" : ((typeof cosmicSandbox !== "undefined" && cosmicSandbox.secondsRemaining <= 5) ? "#f87171" : "#475569")
                            Text {
                                id: lblSec
                                anchors.centerIn: parent
                                text: (typeof cosmicSandbox !== "undefined" && cosmicSandbox.hyperspacePhase > 0.0) ? "WARPING..." : ("Jump in: " + (typeof cosmicSandbox !== "undefined" ? cosmicSandbox.secondsRemaining : 0) + "s")
                                color: "#ffffff"
                                font.bold: true
                                font.pixelSize: 10
                            }
                        }
                    }

                    RowLayout {
                        Layout.fillWidth: true
                        Text {
                            text: typeof cosmicSandbox !== "undefined" ? ("Cam Offset: (" + cosmicSandbox.cameraOffset.x.toFixed(2) + ", " + cosmicSandbox.cameraOffset.y.toFixed(2) + ") | Tilt: " + (cosmicSandbox.diskTilt * 180 / Math.PI).toFixed(0) + "°") : ""
                            color: "#94a3b8"
                            font.pixelSize: 10
                        }
                    }

                    RowLayout {
                        Layout.fillWidth: true
                        Text { text: "Auto Jump (15-60s):"; color: "#cbd5e1" }
                        Item { Layout.fillWidth: true }
                        Switch {
                            checked: typeof cosmicSandbox !== "undefined" ? cosmicSandbox.autoHyperspace : true
                            onToggled: {
                                if (typeof cosmicSandbox !== "undefined") {
                                    cosmicSandbox.autoHyperspace = checked
                                }
                            }
                        }
                    }

                    Button {
                        text: "🚀 Trigger Hyperspace Jump"
                        Layout.fillWidth: true
                        enabled: typeof cosmicSandbox !== "undefined" && cosmicSandbox.hyperspacePhase <= 0.01
                        onClicked: {
                            if (typeof cosmicSandbox !== "undefined") {
                                cosmicSandbox.triggerHyperspace()
                            }
                        }
                    }
                }

                // Concept 5 Synthwave Megacity Controls
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 6
                    visible: root.selectedConcept === 5

                    Text { text: "Metropolis Environmental Controls"; color: "#06b6d4"; font.bold: true }

                    RowLayout {
                        Layout.fillWidth: true
                        Text { text: "Drone Searchlight: " + sldDroneLight.value.toFixed(1) + "x"; color: "#cbd5e1" }
                        Item { Layout.fillWidth: true }
                        Slider {
                            id: sldDroneLight
                            from: 0.2
                            to: 3.0
                            value: 1.2
                            stepSize: 0.1
                            Layout.preferredWidth: 140
                        }
                    }

                    RowLayout {
                        Layout.fillWidth: true
                        Text { text: "Cyber Smog / Fog: " + sldSmog.value.toFixed(2); color: "#cbd5e1" }
                        Item { Layout.fillWidth: true }
                        Slider {
                            id: sldSmog
                            from: 0.1
                            to: 1.5
                            value: 0.85
                            stepSize: 0.05
                            Layout.preferredWidth: 140
                        }
                    }

                    RowLayout {
                        Layout.fillWidth: true
                        Text { text: "Volumetric Rain & Lens Condensation:"; color: "#cbd5e1" }
                        Item { Layout.fillWidth: true }
                        Switch {
                            id: chkRain
                            checked: true
                        }
                    }
                }

                // Concept 6 Real-Time Ephemeris Biome Controls
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 6
                    visible: root.selectedConcept === 6

                    Text { text: "Ephemeris & Terrarium Ingestion"; color: "#10b981"; font.bold: true }

                    RowLayout {
                        Layout.fillWidth: true
                        Text { text: "Follow Local System Clock:"; color: "#cbd5e1" }
                        Item { Layout.fillWidth: true }
                        Switch {
                            id: chkClockSync
                            checked: true
                        }
                    }

                    RowLayout {
                        Layout.fillWidth: true
                        enabled: !chkClockSync.checked
                        opacity: chkClockSync.checked ? 0.5 : 1.0
                        Text {
                            text: "Solar Hour: " + (typeof sldSolarTime !== "undefined" ? sldSolarTime.value.toFixed(1) : "12.0") + "h"
                            color: "#cbd5e1"
                        }
                        Item { Layout.fillWidth: true }
                        Slider {
                            id: sldSolarTime
                            from: 0.0
                            to: 24.0
                            value: 14.5
                            stepSize: 0.5
                            Layout.preferredWidth: 140
                        }
                    }

                    RowLayout {
                        Layout.fillWidth: true
                        Text { text: "Weather:"; color: "#cbd5e1" }
                        ComboBox {
                            id: cmbWeather
                            Layout.fillWidth: true
                            model: ["0: Clear Golden Sky", "1: Spring Rain", "2: Alpine Snowfall", "3: Valley Mist"]
                            currentIndex: 0
                        }
                    }

                    RowLayout {
                        Layout.fillWidth: true
                        Text {
                            text: "Lunar Phase: " + (sldMoonPhase.value === 0.0 || sldMoonPhase.value === 1.0 ? "New" : (sldMoonPhase.value === 0.5 ? "Full" : (sldMoonPhase.value < 0.5 ? "Waxing" : "Waning")))
                            color: "#cbd5e1"
                        }
                        Item { Layout.fillWidth: true }
                        Slider {
                            id: sldMoonPhase
                            from: 0.0
                            to: 1.0
                            value: 0.5
                            stepSize: 0.05
                            Layout.preferredWidth: 140
                        }
                    }

                    RowLayout {
                        Layout.fillWidth: true
                        Text { text: "Valley Fog / Mist: " + sldValleyFog.value.toFixed(2); color: "#cbd5e1" }
                        Item { Layout.fillWidth: true }
                        Slider {
                            id: sldValleyFog
                            from: 0.0
                            to: 1.2
                            value: 0.5
                            stepSize: 0.05
                            Layout.preferredWidth: 140
                        }
                    }
                }

                // Mode Toggle
                RowLayout {
                    Layout.fillWidth: true
                    Text { text: root.lockscreenMode ? "Lockscreen (Secure Random):" : "Wallpaper Mode:"; color: "#cbd5e1" }
                    Switch {
                        checked: root.lockscreenMode
                        onToggled: {
                            root.lockscreenMode = checked
                            if (hasEngine) engineCore.setLockscreenMode(checked)
                        }
                    }
                }

                // Wallpaper Cycling Mode Selector
                RowLayout {
                    Layout.fillWidth: true
                    visible: !root.lockscreenMode
                    Text { text: "Typing Mapping:"; color: "#94a3b8" }
                    ComboBox {
                        Layout.fillWidth: true
                        model: [
                            "0: Keyboard Layout Spatial",
                            "1: Phyllotaxis Golden Spiral",
                            "2: Character Hash Angle"
                        ]
                        currentIndex: root.wallpaperModeCycle
                        onActivated: (idx) => {
                            root.wallpaperModeCycle = idx
                            if (hasEngine) engineCore.setWallpaperCycleMode(idx)
                        }
                    }
                }

                Rectangle { Layout.fillWidth: true; height: 1; color: "#1e293b" }

                // Keystroke & Password Simulation
                Text { text: "Interactive Keystroke Input"; color: "#f8fafc"; font.bold: true }

                TextField {
                    id: txtPasswordSim
                    Layout.fillWidth: true
                    placeholderText: "Type letters here (pushes fluid/nutrients)..."
                    echoMode: root.lockscreenMode ? TextInput.Password : TextInput.Normal
                    color: "#ffffff"
                    background: Rectangle { color: "#0f172a"; radius: 6; border.color: "#334155" }
                    onTextEdited: {
                        let text = txtPasswordSim.text
                        if (text.length > 0 && hasEngine) {
                            engineCore.triggerKeystroke(text.charAt(text.length - 1))
                        }
                    }
                    Keys.onPressed: (event) => {
                        if (event.key === Qt.Key_Backspace || event.key === Qt.Key_Delete) {
                            if (hasEngine) engineCore.triggerBackspace()
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
                            if (hasEngine) engineCore.triggerAuthFail()
                            txtPasswordSim.text = ""
                        }
                    }
                    Button {
                        text: "Simulate Success"
                        Layout.fillWidth: true
                        onClicked: {
                            if (hasEngine) engineCore.triggerAuthSuccess()
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

                // Automatic Gain Control (AGC) & Sensitivity Controls
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 4

                    CheckBox {
                        id: chkAutoGain
                        text: "Auto-Gain Control (AGC)"
                        checked: true
                        onToggled: root.updateAudioParams()
                    }

                    RowLayout {
                        Layout.fillWidth: true
                        Text { text: "Gain: " + sldGain.value.toFixed(1) + "x"; color: "#94a3b8"; Layout.preferredWidth: 80 }
                        Slider {
                            id: sldGain
                            from: 1.0
                            to: 10.0
                            value: 4.0
                            stepSize: 0.5
                            Layout.fillWidth: true
                            onMoved: root.updateAudioParams()
                        }
                    }

                    RowLayout {
                        Layout.fillWidth: true
                        Text { text: "Gamma: " + sldGamma.value.toFixed(2); color: "#94a3b8"; Layout.preferredWidth: 80 }
                        Slider {
                            id: sldGamma
                            from: 0.25
                            to: 1.00
                            value: 0.45
                            stepSize: 0.05
                            Layout.fillWidth: true
                            onMoved: root.updateAudioParams()
                        }
                    }
                }

                // Real-Time Audio Level Meters
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 4

                    Text { text: "Live Audio Spectrum"; color: "#94a3b8"; font.pixelSize: 11; font.bold: true }

                    RowLayout {
                        Layout.fillWidth: true
                        Text { text: "BASS"; color: "#38bdf8"; font.pixelSize: 10; Layout.preferredWidth: 38 }
                        Rectangle {
                            Layout.fillWidth: true
                            height: 8
                            color: "#0f172a"
                            radius: 4
                            Rectangle {
                                width: parent.width * Math.min(1.0, root.bass)
                                height: parent.height
                                radius: 4
                                color: root.bass > 0.75 ? "#ff0055" : (root.bass > 0.4 ? "#00ffaa" : "#00d4ff")
                            }
                        }
                        Text { text: (root.bass * 100).toFixed(0) + "%"; color: "#64748b"; font.pixelSize: 10; Layout.preferredWidth: 32 }
                    }

                    RowLayout {
                        Layout.fillWidth: true
                        Text { text: "MIDS"; color: "#a855f7"; font.pixelSize: 10; Layout.preferredWidth: 38 }
                        Rectangle {
                            Layout.fillWidth: true
                            height: 8
                            color: "#0f172a"
                            radius: 4
                            Rectangle {
                                width: parent.width * Math.min(1.0, root.mids)
                                height: parent.height
                                radius: 4
                                color: root.mids > 0.75 ? "#ff0055" : (root.mids > 0.4 ? "#a855f7" : "#818cf8")
                            }
                        }
                        Text { text: (root.mids * 100).toFixed(0) + "%"; color: "#64748b"; font.pixelSize: 10; Layout.preferredWidth: 32 }
                    }

                    RowLayout {
                        Layout.fillWidth: true
                        Text { text: "TREB"; color: "#f59e0b"; font.pixelSize: 10; Layout.preferredWidth: 38 }
                        Rectangle {
                            Layout.fillWidth: true
                            height: 8
                            color: "#0f172a"
                            radius: 4
                            Rectangle {
                                width: parent.width * Math.min(1.0, root.treble)
                                height: parent.height
                                radius: 4
                                color: root.treble > 0.75 ? "#ff0055" : (root.treble > 0.4 ? "#f59e0b" : "#fbbf24")
                            }
                        }
                        Text { text: (root.treble * 100).toFixed(0) + "%"; color: "#64748b"; font.pixelSize: 10; Layout.preferredWidth: 32 }
                    }
                }

                CheckBox {
                    id: chkWanderBeat
                    text: "Auto-Wander Beat Center"
                    checked: true
                    onToggled: {
                        if (hasEngine) engineCore.setWanderBeat(checked)
                    }
                }

                Rectangle { Layout.fillWidth: true; height: 1; color: "#1e293b" }

                // Ambient Drift & Arrow Steering
                Text { text: "Current Steering (Use Arrow Keys)"; color: "#f8fafc"; font.bold: true }
                RowLayout {
                    Layout.fillWidth: true
                    Text {
                        text: "Drift: (" + root.ambientDrift.x.toFixed(2) + ", " + root.ambientDrift.y.toFixed(2) + ")"
                        color: "#00d4ff"
                        font.pixelSize: 12
                    }
                    Button {
                        text: "Reset Drift"
                        onClicked: {
                            if (hasEngine) engineCore.resetDrift()
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
                Text { text: "Session State: " + root.sessionState; color: "#e2e8f0"; font.pixelSize: 11 }
            }
        }
    }
}
