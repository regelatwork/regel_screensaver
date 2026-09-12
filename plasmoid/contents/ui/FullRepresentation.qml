import QtQuick
import QtQuick.Layouts
import QtQuick.Controls as QQC2
import org.kde.plasma.core as PlasmaCore
import org.kde.plasma.plasmoid
import org.kde.kirigami as Kirigami
import "../engine"

Item {
    id: fullRep

    required property var plasmoidItem

    Layout.minimumWidth: Kirigami.Units.gridUnit * 14
    Layout.minimumHeight: Kirigami.Units.gridUnit * 10
    Layout.preferredWidth: Kirigami.Units.gridUnit * 26
    Layout.preferredHeight: Kirigami.Units.gridUnit * 18
    Layout.fillWidth: true
    Layout.fillHeight: true

    property point pointerPos: Qt.point(0.5, 0.5)
    property point pointerVel: Qt.point(0.0, 0.0)

    // Base background layer
    Rectangle {
        anchors.fill: parent
        color: "#050811"
        z: -1
    }

    // Concept 1: Liquid Neon Abyss GPU Shader Visualizer
    LiquidNeonAbyss {
        anchors.fill: parent
        visible: fullRep.plasmoidItem.activeConcept === 1
        simTime: fullRep.plasmoidItem.simTime
        bass: fullRep.plasmoidItem.bass
        mids: fullRep.plasmoidItem.mids
        treble: fullRep.plasmoidItem.treble
        pointerPos: fullRep.pointerPos
        pointerVel: fullRep.pointerVel
        vortexSpeed: fullRep.plasmoidItem.globalVortexSpeed
        colorBg: fullRep.plasmoidItem.currentFluidPalette.bg
        colorDye1: fullRep.plasmoidItem.currentFluidPalette.dye1
        colorDye2: fullRep.plasmoidItem.currentFluidPalette.dye2
        colorDye3: fullRep.plasmoidItem.currentFluidPalette.dye3
    }

    // Concept 2: The Living Petri Dish (Lenia Continuous Artificial Life)
    LivingPetriDish {
        anchors.fill: parent
        visible: fullRep.plasmoidItem.activeConcept === 2
        simTime: fullRep.plasmoidItem.simTime
        bass: fullRep.plasmoidItem.bass
        mids: fullRep.plasmoidItem.mids
        treble: fullRep.plasmoidItem.treble
        pointerPos: fullRep.pointerPos
        pointerVel: fullRep.pointerVel
        vortexSpeed: fullRep.plasmoidItem.globalVortexSpeed
        apertureMode: fullRep.plasmoidItem.petriAperture ? 1.0 : 0.0
        colorBg: fullRep.plasmoidItem.currentPetriPalette.bg
        colorMembrane: fullRep.plasmoidItem.currentPetriPalette.membrane
        colorOrganelle: fullRep.plasmoidItem.currentPetriPalette.organelle
        colorGlow: fullRep.plasmoidItem.currentPetriPalette.glow
    }

    // Concept 3: The Tranquil Sanctuary (Caustic Koi Pond & Boid Ecosystem)
    TranquilKoiSanctuary {
        anchors.fill: parent
        visible: fullRep.plasmoidItem.activeConcept === 3
        simTime: fullRep.plasmoidItem.simTime
        bass: fullRep.plasmoidItem.bass
        mids: fullRep.plasmoidItem.mids
        treble: fullRep.plasmoidItem.treble
        pointerPos: fullRep.pointerPos
        pointerVel: fullRep.pointerVel
        vortexSpeed: fullRep.plasmoidItem.globalVortexSpeed
        waterClarity: fullRep.plasmoidItem.koiWaterClarity
        colorWater: fullRep.plasmoidItem.currentKoiPalette.water
        colorPebbles: fullRep.plasmoidItem.currentKoiPalette.pebbles
        colorCaustics: fullRep.plasmoidItem.currentKoiPalette.caustics
        colorAccent: fullRep.plasmoidItem.currentKoiPalette.accent
    }

    // Concept 4: Cosmic Gravitational Sandbox (Black Hole & Relativistic Jets)
    CosmicGravitationalSandbox {
        anchors.fill: parent
        visible: fullRep.plasmoidItem.activeConcept === 4
        simTime: fullRep.plasmoidItem.simTime
        bass: fullRep.plasmoidItem.bass
        mids: fullRep.plasmoidItem.mids
        treble: fullRep.plasmoidItem.treble
        pointerPos: fullRep.pointerPos
        pointerVel: fullRep.pointerVel
        vortexSpeed: fullRep.plasmoidItem.globalVortexSpeed
        lensStrength: fullRep.plasmoidItem.cosmicLensStrength
        autoHyperspace: fullRep.plasmoidItem.cosmicAutoCycle
        colorCore: fullRep.plasmoidItem.currentCosmicPalette.core
        colorDisk: fullRep.plasmoidItem.currentCosmicPalette.disk
        colorJets: fullRep.plasmoidItem.currentCosmicPalette.jets
        colorNebula: fullRep.plasmoidItem.currentCosmicPalette.nebula
    }

    // Concept 5: Procedural Synthwave Megacity (Cyberpunk Skyline & Raymarched Highway)
    SynthwaveMegacity {
        anchors.fill: parent
        visible: fullRep.plasmoidItem.activeConcept === 5
        simTime: fullRep.plasmoidItem.simTime
        bass: fullRep.plasmoidItem.bass
        mids: fullRep.plasmoidItem.mids
        treble: fullRep.plasmoidItem.treble
        pointerPos: fullRep.pointerPos
        pointerVel: fullRep.pointerVel
        vortexSpeed: fullRep.plasmoidItem.globalVortexSpeed
        rainDensity: fullRep.plasmoidItem.cityRainDensity
        fogDensity: fullRep.plasmoidItem.cityFogDensity
        colorSky: fullRep.plasmoidItem.currentCityPalette.sky
        colorNeon1: fullRep.plasmoidItem.currentCityPalette.neon1
        colorNeon2: fullRep.plasmoidItem.currentCityPalette.neon2
        colorGrid: fullRep.plasmoidItem.currentCityPalette.grid
    }

    // Concept 6: Real-Time Ephemeris Biome (Ghibli Weather Terrarium)
    RealtimeEphemerisBiome {
        anchors.fill: parent
        visible: fullRep.plasmoidItem.activeConcept === 6
        simTime: fullRep.plasmoidItem.simTime
        bass: fullRep.plasmoidItem.bass
        mids: fullRep.plasmoidItem.mids
        treble: fullRep.plasmoidItem.treble
        pointerPos: fullRep.pointerPos
        pointerVel: fullRep.pointerVel
        vortexSpeed: fullRep.plasmoidItem.globalVortexSpeed
        weatherMode: fullRep.plasmoidItem.biomeWeatherMode
        syncToSystemClock: fullRep.plasmoidItem.biomeSyncClock
        colorSky: fullRep.plasmoidItem.currentBiomePalette.sky
        colorFoliage: fullRep.plasmoidItem.currentBiomePalette.foliage
        colorSunMoon: fullRep.plasmoidItem.currentBiomePalette.sunMoon
        colorWisp: fullRep.plasmoidItem.currentBiomePalette.wisp
    }

    // Concept 7: Kinetic Spiderweb & Resonance Harp (Tactile Elastic Lattice)
    KineticSpiderwebHarp {
        anchors.fill: parent
        visible: fullRep.plasmoidItem.activeConcept === 7
        simTime: fullRep.plasmoidItem.simTime
        bass: fullRep.plasmoidItem.bass
        mids: fullRep.plasmoidItem.mids
        treble: fullRep.plasmoidItem.treble
        pointerPos: fullRep.pointerPos
        pointerVel: fullRep.pointerVel
        vortexSpeed: fullRep.plasmoidItem.globalVortexSpeed
        dewDensity: fullRep.plasmoidItem.harpDewDensity
        tension: fullRep.plasmoidItem.harpTension
        colorSilk: fullRep.plasmoidItem.currentHarpPalette.silk
        colorDew: fullRep.plasmoidItem.currentHarpPalette.dew
        colorResonance: fullRep.plasmoidItem.currentHarpPalette.resonance
        colorVoid: fullRep.plasmoidItem.currentHarpPalette.voidColor
    }

    // Concept 8: The Analog Telemetry Console (Ballistic Galvanometers & P1 Phosphor CRT)
    AnalogTelemetryConsole {
        anchors.fill: parent
        visible: fullRep.plasmoidItem.activeConcept === 8
        simTime: fullRep.plasmoidItem.simTime
        subBass: fullRep.plasmoidItem.subBass
        bass: fullRep.plasmoidItem.bass
        mids: fullRep.plasmoidItem.mids
        treble: fullRep.plasmoidItem.treble
        rms: fullRep.plasmoidItem.rms
        bpm: fullRep.plasmoidItem.bpm
        beat: fullRep.plasmoidItem.beat
        downbeat: fullRep.plasmoidItem.downbeat
        isVocal: fullRep.plasmoidItem.isVocal
        vocalEnergy: fullRep.plasmoidItem.vocalEnergy
        transientHit: fullRep.plasmoidItem.transientHit
        pointerPos: fullRep.pointerPos
        pointerVel: fullRep.pointerVel
        colorChassis: fullRep.plasmoidItem.currentConsolePalette.chassis
        colorDial: fullRep.plasmoidItem.currentConsolePalette.dial
        colorBezel: fullRep.plasmoidItem.currentConsolePalette.bezel
        colorScope: fullRep.plasmoidItem.currentConsolePalette.scope
        colorNeedle: fullRep.plasmoidItem.currentConsolePalette.needle
        colorAccent: fullRep.plasmoidItem.currentConsolePalette.accent
    }

    // Pointer tracker when cursor hovers over widget
    MouseArea {
        id: surfaceMouseArea
        anchors.fill: parent
        hoverEnabled: true
        acceptedButtons: Qt.LeftButton | Qt.MiddleButton | Qt.RightButton
        onPositionChanged: (mouse) => {
            let curX = mouse.x / width
            let curY = mouse.y / height
            fullRep.pointerVel = Qt.point(curX - fullRep.pointerPos.x, curY - fullRep.pointerPos.y)
            fullRep.pointerPos = Qt.point(curX, curY)
            hudHideTimer.restart()
        }
        onClicked: (mouse) => {
            if (mouse.button === Qt.MiddleButton) {
                // Middle click cycles to next concept
                fullRep.plasmoidItem.cycleConcept(1)
            }
        }
    }

    // HUD Auto-hide Timer for Desktop mode
    Timer {
        id: hudHideTimer
        interval: 3500
        running: true
        repeat: false
    }

    readonly property bool isPlanar: fullRep.plasmoidItem && fullRep.plasmoidItem.Plasmoid ? (fullRep.plasmoidItem.Plasmoid.formFactor === PlasmaCore.Types.Planar) : true
    readonly property bool hudVisible: !isPlanar || surfaceMouseArea.containsMouse || hudMouseArea.containsMouse || hudHideTimer.running

    // Interactive Floating HUD Controls
    Rectangle {
        id: hudBar
        anchors.top: parent.top
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.margins: Kirigami.Units.smallSpacing
        height: Kirigami.Units.gridUnit * 2
        radius: Kirigami.Units.cornerRadius
        color: Qt.rgba(0.05, 0.08, 0.15, 0.85)
        border.color: Qt.rgba(1.0, 1.0, 1.0, 0.12)
        border.width: 1
        visible: fullRep.hudVisible
        opacity: fullRep.hudVisible ? 1.0 : 0.0
        Behavior on opacity { NumberAnimation { duration: 250 } }

        MouseArea {
            id: hudMouseArea
            anchors.fill: parent
            hoverEnabled: true
        }

        RowLayout {
            anchors.fill: parent
            anchors.leftMargin: Kirigami.Units.smallSpacing
            anchors.rightMargin: Kirigami.Units.smallSpacing
            spacing: Kirigami.Units.smallSpacing

            QQC2.ToolButton {
                icon.name: "arrow-left"
                QQC2.ToolTip.text: i18n("Previous Archetype")
                QQC2.ToolTip.visible: hovered
                onClicked: fullRep.plasmoidItem.cycleConcept(-1)
            }

            QQC2.Label {
                Layout.fillWidth: true
                text: fullRep.plasmoidItem.conceptNames[fullRep.plasmoidItem.activeConcept - 1] || ""
                color: "#ffffff"
                font.weight: Font.DemiBold
                elide: Text.ElideRight
                verticalAlignment: Text.AlignVCenter
            }

            QQC2.ToolButton {
                icon.name: "arrow-right"
                QQC2.ToolTip.text: i18n("Next Archetype")
                QQC2.ToolTip.visible: hovered
                onClicked: fullRep.plasmoidItem.cycleConcept(1)
            }

            Rectangle {
                Layout.preferredHeight: Kirigami.Units.gridUnit * 1.2
                Layout.preferredWidth: audioStatusLabel.implicitWidth + Kirigami.Units.gridUnit * 0.8
                radius: height / 2
                color: fullRep.plasmoidItem.isAudioLive ? Qt.rgba(0.0, 0.9, 0.5, 0.2) : Qt.rgba(0.5, 0.5, 0.5, 0.2)
                border.color: fullRep.plasmoidItem.isAudioLive ? "#00ffd5" : "#666666"
                border.width: 1

                QQC2.Label {
                    id: audioStatusLabel
                    anchors.centerIn: parent
                    text: fullRep.plasmoidItem.isAudioLive ? "● LIVE" : "○ IDLE"
                    font.pixelSize: Math.round(Kirigami.Theme.defaultFont.pixelSize * 0.8)
                    font.weight: Font.Bold
                    color: fullRep.plasmoidItem.isAudioLive ? "#00ffd5" : "#aaaaaa"
                }
            }

            QQC2.ToolButton {
                icon.name: "configure"
                QQC2.ToolTip.text: i18n("Configure Visualizer…")
                QQC2.ToolTip.visible: hovered
                onClicked: {
                    if (fullRep.plasmoidItem && fullRep.plasmoidItem.Plasmoid && fullRep.plasmoidItem.Plasmoid.internalAction && fullRep.plasmoidItem.Plasmoid.internalAction("configure")) {
                        fullRep.plasmoidItem.Plasmoid.internalAction("configure").trigger()
                    }
                }
            }
        }
    }
}
