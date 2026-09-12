import QtQuick

Item {
    id: root
    anchors.fill: parent

    // Interactive and reactive simulation properties
    property real simTime: 0.0
    property real keystrokeEnergy: 0.0
    property real shockwaveIntensity: 0.0
    property real vortexSpeed: 1.0
    property real bass: 0.08
    property real mids: 0.05
    property real treble: 0.05
    property point pointerPos: Qt.point(0.5, 0.5)
    property point pointerVel: Qt.point(0.0, 0.0)

    // Upgraded interactive features
    property point keystrokePos: Qt.point(0.5, 0.5)
    property point keystrokeDir: Qt.point(0.0, 1.0)
    property point beatCenter: Qt.point(0.5, 0.5)
    property point ambientDrift: Qt.point(0.0, 0.0)
    property real lensStrength: 1.0

    // Neural audio rhythm & vocal choreography
    property real beatPhase: 0.0
    property bool beat: false
    property bool downbeat: false
    property real bpm: 120.0
    property bool isVocal: false
    property real vocalEnergy: 0.0
    property bool transientHit: false

    // Relativistic synchrotron jet flare on downbeats
    property real jetFlare: 0.0
    onDownbeatChanged: {
        if (downbeat) {
            jetFlare = 1.0
        }
    }

    NumberAnimation on jetFlare {
        running: root.jetFlare > 0.0
        from: root.jetFlare
        to: 0.0
        duration: 240
        easing.type: Easing.OutQuad
    }

    // Palette Colors (Astrophysical Accretion & Relativistic Jets)
    property color colorCore: "#38bdf8"    // Relativistic hot blue-white core
    property color colorDisk: "#f97316"    // Incandescent orange-red accretion plasma
    property color colorJets: "#a855f7"    // Collimated violet synchrotron polar jets
    property color colorNebula: "#0f172a"  // Deep interstellar cosmic dust cloud

    // Hyperspace Jump & Anti-Ghosting Parameters
    property point cameraOffset: Qt.point(0.0, 0.0)
    property real diskTilt: 0.0
    property real diskInclination: 2.3
    property real holeScale: 1.0
    property real hyperspacePhase: 0.0
    property real accretionRate: 1.0
    property bool autoHyperspace: true
    property int secondsRemaining: 30
    property string currentObjectName: "Sagittarius A* (Supermassive)"
    property int currentObjectIndex: 0

    // Astronomical Object Catalogs with Distinct Gravitational Profiles
    readonly property var astronomicalObjects: [
        {
            name: "Sagittarius A* (Supermassive Singularity)",
            core: "#38bdf8",
            disk: "#f97316",
            jets: "#a855f7",
            nebula: "#0f172a",
            inclination: 2.3,
            scale: 1.0,
            accretion: 1.0
        },
        {
            name: "M87* (Supergiant Elliptical Shadow)",
            core: "#fef08a",
            disk: "#ea580c",
            jets: "#6366f1",
            nebula: "#18181b",
            inclination: 2.7,
            scale: 1.25,
            accretion: 0.85
        },
        {
            name: "Cygnus X-1 (Stellar Microquasar)",
            core: "#67e8f9",
            disk: "#2563eb",
            jets: "#ec4899",
            nebula: "#030712",
            inclination: 1.9,
            scale: 0.8,
            accretion: 1.35
        },
        {
            name: "Magnetar SGR 1806-20 (Ultra-Magnetic Core)",
            core: "#a7f3d0",
            disk: "#059669",
            jets: "#f43f5e",
            nebula: "#042f2e",
            inclination: 2.5,
            scale: 0.9,
            accretion: 1.1
        },
        {
            name: "Gargantua (Kerr Extreme Horizon)",
            core: "#ffffff",
            disk: "#eab308",
            jets: "#8b5cf6",
            nebula: "#09090b",
            inclination: 3.1,
            scale: 1.15,
            accretion: 0.95
        },
        {
            name: "Blazar 3C 273 (Relativistic Jet Alignment)",
            core: "#f472b6",
            disk: "#fb923c",
            jets: "#38bdf8",
            nebula: "#1e1b4b",
            inclination: 1.6,
            scale: 1.1,
            accretion: 1.4
        }
    ]

    signal hyperspaceJumped(string objectName, int objectIndex)

    function setAstronomicalObject(idx) {
        if (idx < 0 || idx >= astronomicalObjects.length) return;
        currentObjectIndex = idx;
        var obj = astronomicalObjects[idx];
        currentObjectName = obj.name;
        colorCore = Qt.color(obj.core);
        colorDisk = Qt.color(obj.disk);
        colorJets = Qt.color(obj.jets);
        colorNebula = Qt.color(obj.nebula);
        diskInclination = obj.inclination;
        holeScale = obj.scale;
        accretionRate = obj.accretion;
    }

    function triggerHyperspace() {
        if (hyperspaceAnim.running) return;
        hyperspaceAnim.restart();
    }

    function pickNextObject() {
        var nextIdx = (root.currentObjectIndex + 1 + Math.floor(Math.random() * (root.astronomicalObjects.length - 1))) % root.astronomicalObjects.length;
        root.setAstronomicalObject(nextIdx);

        // Anti-ghosting: randomize camera offset in normalized space
        var aspect = (root.width > 0 && root.height > 0) ? (root.width / root.height) : 1.777;
        var randX = (Math.random() * 0.40 - 0.20) * aspect;
        var randY = (Math.random() * 0.30 - 0.15);
        root.cameraOffset = Qt.point(randX, randY);

        // Randomize disk tilt angle across full 360 degrees (-PI to +PI)
        root.diskTilt = (Math.random() * 2.0 - 1.0) * Math.PI;

        // Reset timer to next random interval between 15 and 60 seconds
        root.secondsRemaining = 15 + Math.floor(Math.random() * 46);

        root.hyperspaceJumped(root.currentObjectName, nextIdx);
    }

    SequentialAnimation {
        id: hyperspaceAnim
        running: false

        // Phase 1: Warp acceleration & compression flare (0.0 -> 1.0)
        NumberAnimation {
            target: root
            property: "hyperspacePhase"
            from: 0.0
            to: 1.0
            duration: 850
            easing.type: Easing.InQuad
        }

        // Mid-jump instant: Spacetime jump to new astronomical object & position
        ScriptAction {
            script: root.pickNextObject()
        }

        // Phase 2: Deceleration & emergence into new cosmic sector (1.0 -> 0.0)
        NumberAnimation {
            target: root
            property: "hyperspacePhase"
            from: 1.0
            to: 0.0
            duration: 1150
            easing.type: Easing.OutQuad
        }
    }

    Timer {
        id: jumpTimer
        interval: 1000
        running: root.autoHyperspace
        repeat: true
        onTriggered: {
            if (root.secondsRemaining > 0) {
                root.secondsRemaining--;
            }
            if (root.secondsRemaining <= 0 && !hyperspaceAnim.running) {
                root.triggerHyperspace();
            }
        }
    }

    Component.onCompleted: {
        root.secondsRemaining = 15 + Math.floor(Math.random() * 46);
    }

    ShaderEffect {
        id: cosmicShader
        anchors.fill: parent

        // Neural audio astrophysical choreography
        readonly property real effectiveLens: root.lensStrength * (1.0 + 0.22 * Math.sin(Math.PI * 2.0 * root.beatPhase))
        readonly property real effectiveAccretion: root.accretionRate * (1.0 + 0.2 * Math.cos(Math.PI * 2.0 * root.beatPhase))
        readonly property real vocalPlasma: root.isVocal ? root.vocalEnergy * 0.4 : 0.0

        // Uniforms matching GLSL std140 uniform block in cosmic.frag
        property vector2d u_resolution: Qt.vector2d(Math.max(1.0, root.width), Math.max(1.0, root.height))
        property vector2d u_pointer: Qt.vector2d(root.pointerPos.x, root.pointerPos.y)
        property vector2d u_pointer_vel: Qt.vector2d(root.pointerVel.x, root.pointerVel.y)
        property vector2d u_keystroke_pos: Qt.vector2d(root.keystrokePos.x, root.keystrokePos.y)
        property vector2d u_keystroke_dir: Qt.vector2d(root.keystrokeDir.x, root.keystrokeDir.y)
        property vector2d u_beat_center: Qt.vector2d(root.beatCenter.x, root.beatCenter.y)
        property vector2d u_ambient_drift: Qt.vector2d(root.ambientDrift.x, root.ambientDrift.y)
        property color u_color_core: root.colorCore
        property color u_color_disk: Qt.rgba(Math.min(1.0, root.colorDisk.r + vocalPlasma * 0.4), Math.min(1.0, root.colorDisk.g + vocalPlasma * 0.2), root.colorDisk.b, 1.0)
        property color u_color_jets: Qt.rgba(Math.min(1.0, root.colorJets.r + root.jetFlare * 0.4 + vocalPlasma * 0.3), Math.min(1.0, root.colorJets.g + root.jetFlare * 0.4), Math.min(1.0, root.colorJets.b + root.jetFlare * 0.6 + vocalPlasma * 0.5), 1.0)
        property color u_color_nebula: root.colorNebula
        property real u_time: root.simTime
        property real u_keystroke_energy: root.keystrokeEnergy
        property real u_shockwave_intensity: root.shockwaveIntensity
        property real u_vortex_speed: root.vortexSpeed
        property real u_bass: root.bass + root.jetFlare * 0.35
        property real u_mids: root.mids + vocalPlasma * 0.25
        property real u_treble: root.treble + (root.transientHit ? 0.25 : 0.0)
        property real u_lens_strength: effectiveLens
        property vector2d u_camera_offset: Qt.vector2d(root.cameraOffset.x, root.cameraOffset.y)
        property real u_disk_tilt: root.diskTilt
        property real u_disk_inclination: root.diskInclination
        property real u_hole_scale: root.holeScale
        property real u_hyperspace_phase: root.hyperspacePhase
        property real u_accretion_rate: effectiveAccretion
        property real u_pad: 0.0

        vertexShader: Qt.resolvedUrl("shaders/cosmic.vert.qsb")
        fragmentShader: Qt.resolvedUrl("shaders/cosmic.frag.qsb")
    }
}
