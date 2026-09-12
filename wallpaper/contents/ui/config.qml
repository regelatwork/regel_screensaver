import QtQuick
import QtQuick.Controls as QQC2
import org.kde.kirigami as Kirigami

Kirigami.FormLayout {
    id: root

    property alias cfg_activeConcept: conceptComboBox.currentConceptValue
    property alias cfg_vortexSpeed: speedSlider.value

    QQC2.ComboBox {
        id: conceptComboBox
        Kirigami.FormData.label: "Aesthetic Concept:"
        textRole: "text"
        valueRole: "value"
        model: [
            { text: "1. Liquid Neon Abyss (Fluid Cymatics)", value: 1 },
            { text: "2. The Living Petri Dish (Lenia Continuous Life)", value: 2 },
            { text: "3. The Tranquil Sanctuary (Caustic Koi Pond)", value: 3 },
            { text: "4. Cosmic Gravitational Sandbox (Relativistic Black Hole)", value: 4 },
            { text: "5. Procedural Synthwave Megacity (Cyberpunk Skyline)", value: 5 },
            { text: "6. Real-Time Ephemeris Biome (Painterly Terrarium)", value: 6 },
            { text: "7. Kinetic Spiderweb & Resonance Harp (Elastic Lattice)", value: 7 }
        ]
        property int currentConceptValue: currentIndex + 1
        currentIndex: (typeof cfg_activeConcept !== "undefined" ? Math.max(0, cfg_activeConcept - 1) : 0)
        onActivated: {
            currentConceptValue = currentIndex + 1
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
}
