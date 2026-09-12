import QtQuick
import QtQuick.Controls as QQC2
import QtQuick.Layouts
import org.kde.kirigami as Kirigami

Kirigami.FormLayout {
    id: root
    twinFormLayouts: parentLayout

    property alias formLayout: root
    property int cfg_activeConcept: 1
    property alias cfg_vortexSpeed: speedSlider.value

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
            "7. Kinetic Spiderweb & Resonance Harp (Elastic Lattice)"
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
}
