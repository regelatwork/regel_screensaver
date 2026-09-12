import QtQuick
import QtQuick.Controls as QQC2
import QtQuick.Layouts
import org.kde.kirigami as Kirigami
import "../engine"

Kirigami.FormLayout {
    id: root
    twinFormLayouts: parentLayout

    property alias formLayout: root

    signal configurationChanged()

    // General
    property int cfg_activeConcept: 1
    property alias cfg_vortexSpeed: speedSlider.value

    // Archetype 1: Liquid Neon Abyss
    property int cfg_concept1Palette: 0

    // Archetype 2: The Living Petri Dish
    property int cfg_concept2Palette: 0
    property alias cfg_petriAperture: petriApertureCheckBox.checked

    // Archetype 3: The Tranquil Sanctuary (Koi Pond)
    property int cfg_concept3Palette: 0
    property alias cfg_koiWaterClarity: koiClaritySlider.value

    // Archetype 4: Cosmic Gravitational Sandbox
    property int cfg_concept4Palette: 0
    property alias cfg_cosmicLensStrength: cosmicLensSlider.value
    property alias cfg_cosmicAutoCycle: cosmicCycleCheckBox.checked

    // Archetype 5: Procedural Synthwave Megacity
    property int cfg_concept5Palette: 0
    property alias cfg_cityRainDensity: cityRainSlider.value
    property alias cfg_cityFogDensity: cityFogSlider.value

    // Archetype 6: Real-Time Ephemeris Biome
    property int cfg_concept6Palette: 0
    property int cfg_biomeWeatherMode: 0
    property alias cfg_biomeSyncClock: biomeSyncClockCheckBox.checked

    // Archetype 7: Kinetic Spiderweb & Resonance Harp
    property int cfg_concept7Palette: 0
    property alias cfg_harpDewDensity: harpDewSlider.value
    property alias cfg_harpTension: harpTensionSlider.value

    // Archetype 8: The Analog Telemetry Console
    property int cfg_concept8Palette: 0

    // Audio Reactivity
    property alias cfg_audioReactive: audioReactiveCheckBox.checked
    property string cfg_audioSource: "monitor"
    property alias cfg_audioAutoGain: autoGainCheckBox.checked
    property alias cfg_audioGain: gainSlider.value

    Palettes {
        id: palettes
    }

    // =========================================================================
    // SECTION: General Visualizer Settings
    // =========================================================================
    QQC2.ComboBox {
        id: conceptComboBox
        Kirigami.FormData.label: "Aesthetic Concept:"
        model: [
            "1. Liquid Neon Abyss (Fluid Cymatics)",
            "2. The Living Petri Dish (Lenia Continuous Life)",
            "3. The Tranquil Sanctuary (Caustic Koi Pond)",
            "4. Cosmic Gravitational Sandbox (Relativistic Black Hole)",
            "5. Procedural Synthwave Megacity (Cyberpunk Skyline)",
            "6. Real-Time Ephemeris Biome (Painterly Terrarium)",
            "7. Kinetic Spiderweb & Resonance Harp (Elastic Lattice)",
            "8. The Analog Telemetry Console (Ballistic Galvanometers & CRT)"
        ]
        currentIndex: Math.max(0, Math.min(model.length - 1, root.cfg_activeConcept - 1))
        onActivated: (index) => {
            root.cfg_activeConcept = index + 1
        }
    }

    QQC2.Slider {
        id: speedSlider
        Kirigami.FormData.label: "Simulation Flow Speed:"
        from: 0.2
        to: 2.0
        stepSize: 0.1
        value: 0.8
    }

    // =========================================================================
    // SECTION: Context-Sensitive Archetype Customization
    // =========================================================================
    Kirigami.Separator {
        Kirigami.FormData.isSection: true
        Kirigami.FormData.label: "Archetype Customization"
    }

    // --- Concept 1: Liquid Neon Abyss ---
    QQC2.ComboBox {
        id: concept1Combo
        Kirigami.FormData.label: "Fluid Abyss Theme:"
        visible: root.cfg_activeConcept === 1
        model: palettes.getNames(palettes.fluidPalettes)
        currentIndex: Math.max(0, Math.min(model.length - 1, root.cfg_concept1Palette))
        onActivated: (index) => { root.cfg_concept1Palette = index }
    }

    // --- Concept 2: The Living Petri Dish ---
    QQC2.ComboBox {
        id: concept2Combo
        Kirigami.FormData.label: "Bioluminescent Theme:"
        visible: root.cfg_activeConcept === 2
        model: palettes.getNames(palettes.petriPalettes)
        currentIndex: Math.max(0, Math.min(model.length - 1, root.cfg_concept2Palette))
        onActivated: (index) => { root.cfg_concept2Palette = index }
    }

    QQC2.CheckBox {
        id: petriApertureCheckBox
        Kirigami.FormData.label: "Microscope Slide:"
        text: "Circular Glass Lens Border"
        visible: root.cfg_activeConcept === 2
        checked: false
    }

    // --- Concept 3: The Tranquil Sanctuary (Koi Pond) ---
    QQC2.ComboBox {
        id: concept3Combo
        Kirigami.FormData.label: "Zen Pond Theme:"
        visible: root.cfg_activeConcept === 3
        model: palettes.getNames(palettes.koiPalettes)
        currentIndex: Math.max(0, Math.min(model.length - 1, root.cfg_concept3Palette))
        onActivated: (index) => { root.cfg_concept3Palette = index }
    }

    QQC2.Slider {
        id: koiClaritySlider
        Kirigami.FormData.label: "Water Clarity:"
        visible: root.cfg_activeConcept === 3
        from: 0.2
        to: 2.0
        stepSize: 0.1
        value: 1.0
    }

    // --- Concept 4: Cosmic Gravitational Sandbox ---
    QQC2.ComboBox {
        id: concept4Combo
        Kirigami.FormData.label: "Celestial Object:"
        visible: root.cfg_activeConcept === 4
        model: palettes.getNames(palettes.cosmicPalettes)
        currentIndex: Math.max(0, Math.min(model.length - 1, root.cfg_concept4Palette))
        onActivated: (index) => { root.cfg_concept4Palette = index }
    }

    QQC2.Slider {
        id: cosmicLensSlider
        Kirigami.FormData.label: "Gravitational Lensing:"
        visible: root.cfg_activeConcept === 4
        from: 0.2
        to: 2.0
        stepSize: 0.1
        value: 1.0
    }

    QQC2.CheckBox {
        id: cosmicCycleCheckBox
        Kirigami.FormData.label: "Hyperspace Drift:"
        text: "Auto-Cycle Celestial Bodies"
        visible: root.cfg_activeConcept === 4
        checked: true
    }

    // --- Concept 5: Procedural Synthwave Megacity ---
    QQC2.ComboBox {
        id: concept5Combo
        Kirigami.FormData.label: "Cyberpunk Theme:"
        visible: root.cfg_activeConcept === 5
        model: palettes.getNames(palettes.cityPalettes)
        currentIndex: Math.max(0, Math.min(model.length - 1, root.cfg_concept5Palette))
        onActivated: (index) => { root.cfg_concept5Palette = index }
    }

    QQC2.Slider {
        id: cityRainSlider
        Kirigami.FormData.label: "Neon Rain Intensity:"
        visible: root.cfg_activeConcept === 5
        from: 0.0
        to: 1.0
        stepSize: 0.05
        value: 0.65
    }

    QQC2.Slider {
        id: cityFogSlider
        Kirigami.FormData.label: "Atmospheric Smog:"
        visible: root.cfg_activeConcept === 5
        from: 0.1
        to: 1.0
        stepSize: 0.05
        value: 0.85
    }

    // --- Concept 6: Real-Time Ephemeris Biome ---
    QQC2.ComboBox {
        id: concept6Combo
        Kirigami.FormData.label: "Ghibli Season Theme:"
        visible: root.cfg_activeConcept === 6
        model: palettes.getNames(palettes.biomePalettes)
        currentIndex: Math.max(0, Math.min(model.length - 1, root.cfg_concept6Palette))
        onActivated: (index) => { root.cfg_concept6Palette = index }
    }

    QQC2.ComboBox {
        id: biomeWeatherComboBox
        Kirigami.FormData.label: "Weather Atmosphere:"
        visible: root.cfg_activeConcept === 6
        model: [
            "Clear Day / Night Sky",
            "Rain Downpour",
            "Snow Flurries",
            "Mountain Mist & Fog"
        ]
        currentIndex: Math.max(0, Math.min(model.length - 1, root.cfg_biomeWeatherMode))
        onActivated: (index) => { root.cfg_biomeWeatherMode = index }
    }

    QQC2.CheckBox {
        id: biomeSyncClockCheckBox
        Kirigami.FormData.label: "Day / Night Cycle:"
        text: "Sync Sun & Moon to Real Clock"
        visible: root.cfg_activeConcept === 6
        checked: true
    }

    // --- Concept 7: Kinetic Spiderweb & Resonance Harp ---
    QQC2.ComboBox {
        id: concept7Combo
        Kirigami.FormData.label: "Resonance Palette:"
        visible: root.cfg_activeConcept === 7
        model: palettes.getNames(palettes.harpPalettes)
        currentIndex: Math.max(0, Math.min(model.length - 1, root.cfg_concept7Palette))
        onActivated: (index) => { root.cfg_concept7Palette = index }
    }

    QQC2.Slider {
        id: harpDewSlider
        Kirigami.FormData.label: "Dewdrop Density:"
        visible: root.cfg_activeConcept === 7
        from: 0.0
        to: 1.0
        stepSize: 0.05
        value: 0.75
    }

    QQC2.Slider {
        id: harpTensionSlider
        Kirigami.FormData.label: "Silk Elastic Tension:"
        visible: root.cfg_activeConcept === 7
        from: 0.5
        to: 2.0
        stepSize: 0.1
        value: 1.0
    }

    // --- Concept 8: The Analog Telemetry Console ---
    QQC2.ComboBox {
        id: concept8Combo
        Kirigami.FormData.label: "Console Theme:"
        visible: root.cfg_activeConcept === 8
        model: palettes.getNames(palettes.consolePalettes)
        currentIndex: Math.max(0, Math.min(model.length - 1, root.cfg_concept8Palette))
        onActivated: (index) => { root.cfg_concept8Palette = index }
    }

    // =========================================================================
    // SECTION: Audio Reactivity Settings
    // =========================================================================
    Kirigami.Separator {
        Kirigami.FormData.isSection: true
        Kirigami.FormData.label: "Audio Reactivity (PipeWire FFT)"
    }

    QQC2.CheckBox {
        id: audioReactiveCheckBox
        Kirigami.FormData.label: "Audio Reactivity:"
        text: "React to System Audio"
        checked: true
    }

    QQC2.ComboBox {
        id: audioSourceComboBox
        Kirigami.FormData.label: "Audio Input Source:"
        enabled: audioReactiveCheckBox.checked
        model: [
            "System Audio (Desktop Output)",
            "Microphone (Voice & Claps)"
        ]
        currentIndex: (root.cfg_audioSource === "mic") ? 1 : 0
        onActivated: (index) => {
            root.cfg_audioSource = (index === 1) ? "mic" : "monitor"
        }
    }

    QQC2.CheckBox {
        id: autoGainCheckBox
        Kirigami.FormData.label: "Gain Detection:"
        text: "Auto-detect gain (Automatic Gain Control)"
        enabled: audioReactiveCheckBox.checked
        checked: true
    }

    QQC2.Slider {
        id: gainSlider
        Kirigami.FormData.label: "Audio Sensitivity Gain:"
        enabled: audioReactiveCheckBox.checked && !autoGainCheckBox.checked
        from: 1.0
        to: 10.0
        stepSize: 0.5
        value: 3.5
    }
}
