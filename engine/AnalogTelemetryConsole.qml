import QtQuick
import QtQuick.Layouts

Item {
    id: root
    width: 1280
    height: 720
    anchors.fill: parent

    // Interactive & telemetry inputs
    property real simTime: 0.0
    property real subBass: 0.05
    property real bass: 0.08
    property real mids: 0.05
    property real treble: 0.05
    property real rms: 0.05
    property real bpm: 120.0
    property bool beat: false
    property bool downbeat: false
    property real beatPhase: 0.0
    property bool isVocal: false
    property real vocalEnergy: 0.0
    property bool transientHit: false
    property real keystrokeEnergy: 0.0
    property real shockwaveIntensity: 0.0
    property real vortexSpeed: 1.0
    property point pointerPos: Qt.point(0.5, 0.5)
    property point pointerVel: Qt.point(0.0, 0.0)

    // Palette custom properties
    property color colorChassis: "#18191e"
    property color colorDial: "#f5f0e6"
    property color colorBezel: "#252730"
    property color colorScope: "#0f2814"
    property color colorNeedle: "#d9381e"
    property color colorAccent: "#38bdf8"

    // Ballistic Meter Physics State (2nd-order ODE: J*theta'' + c*theta' + k*theta = tau)
    // 6 Independent Moving-Coil Galvanometers
    property real meterSubAngle: -45.0
    property real meterSubVel: 0.0
    property real meterSubTarget: -45.0
    property real meterSubJitter: 0.0

    property real meterBassAngle: -45.0
    property real meterBassVel: 0.0
    property real meterBassTarget: -45.0
    property real meterBassJitter: 0.0

    property real meterMidsAngle: -45.0
    property real meterMidsVel: 0.0
    property real meterMidsTarget: -45.0
    property real meterMidsJitter: 0.0

    property real meterTrebAngle: -45.0
    property real meterTrebVel: 0.0
    property real meterTrebTarget: -45.0
    property real meterTrebJitter: 0.0

    property real meterVocalAngle: -45.0
    property real meterVocalVel: 0.0
    property real meterVocalTarget: -45.0
    property real meterVocalJitter: 0.0

    property real meterRmsAngle: -45.0
    property real meterRmsVel: 0.0
    property real meterRmsTarget: -45.0
    property real meterRmsJitter: 0.0

    // Thermal Lamp Filament States (Asymmetric Peak-Hold Pulse Stretcher)
    property real lampRubyLum: 0.0
    property real lampRubyHold: 0.0

    property real lampAmberLum: 0.0
    property real lampAmberHold: 0.0

    property real lampWhiteLum: 0.0
    property real lampWhiteHold: 0.0

    property real lampEmeraldLum: 0.0
    property real lampEmeraldHold: 0.0

    property real lampCitrineLum: 0.0
    property real lampCitrineHold: 0.0

    property real lampBlueLum: 0.85

    // Scope mode: 0 = Linear Waveform Sweep, 1 = Lissajous Phase Ellipse
    property int scopeMode: 0

    // Internal simulation frame update (60 Hz physics & ballistics)
    Timer {
        id: physicsTimer
        interval: 16
        running: true
        repeat: true
        onTriggered: {
            let dt = 0.016;

            // Chassis vibration & shockwave overload calculation
            let jitterDecay = 0.88;
            root.meterSubJitter *= jitterDecay;
            root.meterBassJitter *= jitterDecay;
            root.meterMidsJitter *= jitterDecay;
            root.meterTrebJitter *= jitterDecay;
            root.meterVocalJitter *= jitterDecay;
            root.meterRmsJitter *= jitterDecay;

            if (root.keystrokeEnergy > 0.01) {
                let jMag = root.keystrokeEnergy * 16.0;
                root.meterSubJitter += (Math.random() - 0.5) * jMag;
                root.meterBassJitter += (Math.random() - 0.5) * jMag;
                root.meterMidsJitter += (Math.random() - 0.5) * jMag;
                root.meterTrebJitter += (Math.random() - 0.5) * jMag;
                root.meterVocalJitter += (Math.random() - 0.5) * jMag;
                root.meterRmsJitter += (Math.random() - 0.5) * jMag;
            }

            let overload = root.shockwaveIntensity * 50.0;

            // Target calculations: -45 deg (-20 VU) to +38 deg (+3 VU overload)
            root.meterSubTarget = -45.0 + Math.min(1.0, Math.max(0.0, root.subBass * 1.35)) * 75.0 + overload + root.meterSubJitter;
            root.meterBassTarget = -45.0 + Math.min(1.0, Math.max(0.0, root.bass * 1.30)) * 75.0 + overload + root.meterBassJitter;
            root.meterMidsTarget = -45.0 + Math.min(1.0, Math.max(0.0, root.mids * 1.30)) * 75.0 + overload + root.meterMidsJitter;
            root.meterTrebTarget = -45.0 + Math.min(1.0, Math.max(0.0, root.treble * 1.35)) * 75.0 + overload + root.meterTrebJitter;
            root.meterVocalTarget = -45.0 + Math.min(1.0, Math.max(0.0, root.vocalEnergy * 1.35)) * 75.0 + overload + root.meterVocalJitter;
            root.meterRmsTarget = -45.0 + Math.min(1.0, Math.max(0.0, root.rms * 1.30)) * 75.0 + overload + root.meterRmsJitter;

            // ANSI C16.5 2nd-Order Spring Integration (omega_n = 14.5, zeta = 0.82)
            let omega_n = 14.5;
            let zeta = 0.82;
            let k = omega_n * omega_n;
            let c = 2.0 * zeta * omega_n;

            function stepMeter(target, angle, vel) {
                let accel = k * (target - angle) - c * vel;
                let newVel = vel + accel * dt;
                let newAngle = angle + newVel * dt;
                return {
                    angle: Math.max(-48.0, Math.min(48.0, newAngle)),
                    vel: newVel
                };
            }

            let sSub = stepMeter(root.meterSubTarget, root.meterSubAngle, root.meterSubVel);
            root.meterSubAngle = sSub.angle; root.meterSubVel = sSub.vel;

            let sBass = stepMeter(root.meterBassTarget, root.meterBassAngle, root.meterBassVel);
            root.meterBassAngle = sBass.angle; root.meterBassVel = sBass.vel;

            let sMids = stepMeter(root.meterMidsTarget, root.meterMidsAngle, root.meterMidsVel);
            root.meterMidsAngle = sMids.angle; root.meterMidsVel = sMids.vel;

            let sTreb = stepMeter(root.meterTrebTarget, root.meterTrebAngle, root.meterTrebVel);
            root.meterTrebAngle = sTreb.angle; root.meterTrebVel = sTreb.vel;

            let sVocal = stepMeter(root.meterVocalTarget, root.meterVocalAngle, root.meterVocalVel);
            root.meterVocalAngle = sVocal.angle; root.meterVocalVel = sVocal.vel;

            let sRms = stepMeter(root.meterRmsTarget, root.meterRmsAngle, root.meterRmsVel);
            root.meterRmsAngle = sRms.angle; root.meterRmsVel = sRms.vel;

            // Asymmetric Peak-Hold Pulse Stretcher for Indicator Lamps
            // (Instant attack, 45ms hold plateau, 160ms incandescent cooling decay)
            let holdTime = 0.045;
            let tauDecay = 0.16;

            function stepLamp(active, currentLum, currentHold, decayRate) {
                let tau = decayRate || tauDecay;
                if (active) {
                    return { lum: 1.0, hold: holdTime };
                } else if (currentHold > 0.0) {
                    return { lum: 1.0, hold: currentHold - dt };
                } else {
                    return { lum: currentLum * Math.exp(-dt / tau), hold: 0.0 };
                }
            }

            let ruby = stepLamp(root.downbeat || root.shockwaveIntensity > 0.2, root.lampRubyLum, root.lampRubyHold, 0.18);
            root.lampRubyLum = ruby.lum; root.lampRubyHold = ruby.hold;

            let amber = stepLamp(root.beat, root.lampAmberLum, root.lampAmberHold, 0.16);
            root.lampAmberLum = amber.lum; root.lampAmberHold = amber.hold;

            let white = stepLamp(root.transientHit, root.lampWhiteLum, root.lampWhiteHold, 0.12);
            root.lampWhiteLum = white.lum; root.lampWhiteHold = white.hold;

            let emerald = stepLamp(root.isVocal, root.lampEmeraldLum, root.lampEmeraldHold, 0.22);
            root.lampEmeraldLum = emerald.lum; root.lampEmeraldHold = emerald.hold;

            let citrine = stepLamp(root.mids > 0.25, root.lampCitrineLum, root.lampCitrineHold, 0.16);
            root.lampCitrineLum = citrine.lum; root.lampCitrineHold = citrine.hold;

            let blueTarget = (root.rms > 0.005) ? 0.92 : 0.35;
            root.lampBlueLum += (blueTarget - root.lampBlueLum) * 0.10;

            // Redraw CRT Oscilloscope (VU meter needles rotate via hardware scenegraph transforms)
            scopeCanvas.requestPaint();
        }
    }

    // Main Chassis Background with brushed hairline texture
    Rectangle {
        id: chassisBg
        anchors.fill: parent
        gradient: Gradient {
            GradientStop { position: 0.0; color: Qt.darker(root.colorChassis, 1.15) }
            GradientStop { position: 0.5; color: root.colorChassis }
            GradientStop { position: 1.0; color: Qt.darker(root.colorChassis, 1.3) }
        }

        Repeater {
            model: Math.floor(parent.height / 6)
            Rectangle {
                width: parent.width
                height: 1
                y: index * 6
                color: "#ffffff"
                opacity: 0.018 + (index % 3) * 0.008
            }
        }

        // Outer Bezel Rim & Hex Corner Bolts
        Rectangle {
            anchors.fill: parent
            anchors.margins: 6
            color: "transparent"
            border.color: Qt.lighter(root.colorChassis, 1.4)
            border.width: 1.5

            Repeater {
                model: [
                    Qt.point(16, 16),
                    Qt.point(parent.width - 28, 16),
                    Qt.point(16, parent.height - 28),
                    Qt.point(parent.width - 28, parent.height - 28)
                ]
                Rectangle {
                    x: modelData.x; y: modelData.y
                    width: 12; height: 12; radius: 6
                    color: "#2a2c34"
                    border.color: "#111216"
                    border.width: 1
                    Rectangle {
                        anchors.centerIn: parent
                        width: 6; height: 2; color: "#14151a"
                    }
                }
            }
        }
    }

    // Top Silkscreen Nameplate
    RowLayout {
        anchors.top: parent.top
        anchors.topMargin: 12
        anchors.horizontalCenter: parent.horizontalCenter
        spacing: 20

        Rectangle { width: 45; height: 1; color: "#64748b"; opacity: 0.4 }

        ColumnLayout {
            spacing: 1
            Text {
                text: "REGEL 8000 TELEMETRY CONSOLE"
                font.pixelSize: 11
                font.bold: true
                font.letterSpacing: 2.5
                color: "#94a3b8"
                Layout.alignment: Qt.AlignHCenter
            }
            Text {
                text: "BALLISTIC MULTI-BAND DYNAMICS MATRIX & P1 CRT TIMEBASE"
                font.pixelSize: 8
                font.letterSpacing: 1.5
                color: "#64748b"
                Layout.alignment: Qt.AlignHCenter
            }
        }

        Rectangle { width: 45; height: 1; color: "#64748b"; opacity: 0.4 }
    }

    // =========================================================================
    // REUSABLE COMPONENT: VU GAUGE WITH INTEGRAL CO-LOCATED PILOT LAMP
    // =========================================================================
    component VuGauge: Item {
        id: gauge
        property string title: "VU"
        property string subtitle: ""
        property real needleAngle: -45.0
        property bool hasLamp: false
        property color lampColor: "#ef4444"
        property real lampLum: 0.0
        property string lampLabel: ""
        property alias canvas: meterCanvas

        function requestPaint() {
            meterCanvas.requestPaint();
        }

        onWidthChanged: meterCanvas.requestPaint()
        onHeightChanged: meterCanvas.requestPaint()
        Component.onCompleted: meterCanvas.requestPaint()
        Connections {
            target: root
            function onColorDialChanged() { meterCanvas.requestPaint(); }
        }

        signal glassTapped()

        // 1. Exterior Chassis Mounting Strip with Jewel Pilot Lamp (OUTSIDE the meter enclosure!)
        Rectangle {
            id: lampChassisBar
            anchors.top: parent.top
            anchors.left: parent.left
            anchors.right: parent.right
            height: 24
            radius: 3
            color: "#13151a"
            border.color: "#23262f"
            border.width: 1

            // Screw Rivet Left
            Rectangle {
                anchors.left: parent.left
                anchors.leftMargin: 6
                anchors.verticalCenter: parent.verticalCenter
                width: 5; height: 5; radius: 2.5
                color: "#1e2128"
                border.color: "#383c48"
                border.width: 0.8
            }

            // Co-Located Faceted Jewel Pilot Lamp (External to Meter)
            RowLayout {
                anchors.left: parent.left
                anchors.leftMargin: 18
                anchors.verticalCenter: parent.verticalCenter
                spacing: 6
                visible: gauge.hasLamp

                // Jewel Lamp Outer Housing
                Item {
                    width: 14
                    height: 14

                    // Incandescent Glow Flare
                    Rectangle {
                        anchors.centerIn: parent
                        width: 26
                        height: 26
                        radius: 13
                        color: gauge.lampColor
                        opacity: gauge.lampLum * 0.45
                    }

                    // Metal Bezel Ring
                    Rectangle {
                        anchors.fill: parent
                        radius: 7
                        color: "#08090d"
                        border.color: Qt.lighter(gauge.lampColor, 1.15)
                        border.width: 1.2

                        // Faceted Refractory Lens
                        Rectangle {
                            anchors.centerIn: parent
                            width: 8
                            height: 8
                            radius: 4
                            color: Qt.rgba(
                                gauge.lampColor.r * (0.2 + gauge.lampLum * 0.8),
                                gauge.lampColor.g * (0.2 + gauge.lampLum * 0.8),
                                gauge.lampColor.b * (0.2 + gauge.lampLum * 0.8),
                                1.0
                            )

                            // Hotspot core
                            Rectangle {
                                anchors.centerIn: parent
                                width: 3
                                height: 3
                                radius: 1.5
                                color: Qt.lighter(gauge.lampColor, 1.8)
                                opacity: 0.35 + gauge.lampLum * 0.65
                            }
                        }
                    }
                }

                // Silkscreen Lamp Caption
                Text {
                    text: gauge.lampLabel
                    font.pixelSize: 8
                    font.bold: true
                    font.letterSpacing: 0.5
                    color: gauge.lampLum > 0.15 ? gauge.lampColor : Qt.darker(gauge.lampColor, 1.35)
                }
            }

            // Channel Title & Subtitle Badge (Right-aligned in chassis bar)
            RowLayout {
                anchors.right: parent.right
                anchors.rightMargin: 18
                anchors.verticalCenter: parent.verticalCenter
                spacing: 8

                Text {
                    text: gauge.title
                    font.pixelSize: 9
                    font.bold: true
                    font.letterSpacing: 0.8
                    color: "#94a3b8"
                }

                Text {
                    text: gauge.subtitle
                    font.pixelSize: 7
                    color: "#64748b"
                    visible: gauge.subtitle.length > 0
                }
            }

            // Screw Rivet Right
            Rectangle {
                anchors.right: parent.right
                anchors.rightMargin: 6
                anchors.verticalCenter: parent.verticalCenter
                width: 5; height: 5; radius: 2.5
                color: "#1e2128"
                border.color: "#383c48"
                border.width: 0.8
            }
        }

        // 2. Sealed Meter Enclosure (Galvanometer Dial & Needle)
        Rectangle {
            id: meterFrame
            anchors.top: lampChassisBar.bottom
            anchors.topMargin: 4
            anchors.left: parent.left
            anchors.right: parent.right
            anchors.bottom: parent.bottom
            radius: 5
            color: "#101216"
            border.color: root.colorBezel
            border.width: 2

            // Dial Content Container (Dial face, needle arm, boss cap, glass reflection)
            Item {
                id: dialContent
                anchors.fill: parent
                anchors.margins: 5
                clip: true

                // Dial Faceplate Canvas
                Canvas {
                    id: meterCanvas
                    anchors.fill: parent
                    renderTarget: Canvas.FramebufferObject

                    onPaint: {
                        if (width <= 20 || height <= 20) return;
                        let ctx = getContext("2d");
                        ctx.reset();

                        let w = width;
                        let h = height;

                        // Dial Face Background
                        let dialGrad = ctx.createLinearGradient(0, 0, 0, h);
                        dialGrad.addColorStop(0.0, root.colorDial);
                        dialGrad.addColorStop(1.0, Qt.darker(root.colorDial, 1.12));
                        ctx.fillStyle = dialGrad;
                        ctx.fillRect(0, 0, w, h);

                        // Arc Center & Radii
                        let cx = w / 2;
                        let cy = h * 1.20;
                        let r = h * 0.98;

                        // Main Meter Arc (-45 deg to +45 deg)
                        let startRad = (-135) * Math.PI / 180;
                        let endRad = (-45) * Math.PI / 180;
                        let zeroRad = (-75) * Math.PI / 180;

                        // Normal Sector (Dark Slate)
                        ctx.beginPath();
                        ctx.arc(cx, cy, r, startRad, zeroRad, false);
                        ctx.lineWidth = 1.8;
                        ctx.strokeStyle = "#1e293b";
                        ctx.stroke();

                        // Redline Sector (Overload)
                        ctx.beginPath();
                        ctx.arc(cx, cy, r, zeroRad, endRad, false);
                        ctx.lineWidth = 3.0;
                        ctx.strokeStyle = "#ef4444";
                        ctx.stroke();

                        // Calibrated Tick Marks & Scale Numbers
                        let ticks = [
                            { db: "-20", deg: -45 },
                            { db: "-10", deg: -32 },
                            { db: "-7",  deg: -24 },
                            { db: "-5",  deg: -18 },
                            { db: "-3",  deg: -10 },
                            { db: "-1",  deg: -2 },
                            { db: "0",   deg: 6 },
                            { db: "+1",  deg: 16 },
                            { db: "+2",  deg: 28 },
                            { db: "+3",  deg: 40 }
                        ];

                        ctx.font = "bold 7px sans-serif";
                        ctx.textAlign = "center";

                        for (let i = 0; i < ticks.length; ++i) {
                            let t = ticks[i];
                            let rad = (t.deg - 90) * Math.PI / 180;
                            let isRed = t.deg >= 6;

                            ctx.strokeStyle = isRed ? "#ef4444" : "#1e293b";
                            ctx.fillStyle = isRed ? "#ef4444" : "#334155";

                            let x1 = cx + Math.cos(rad) * (r - 1);
                            let y1 = cy + Math.sin(rad) * (r - 1);
                            let x2 = cx + Math.cos(rad) * (r - (isRed ? 7 : 6));
                            let y2 = cy + Math.sin(rad) * (r - (isRed ? 7 : 6));

                            ctx.beginPath();
                            ctx.moveTo(x1, y1);
                            ctx.lineTo(x2, y2);
                            ctx.lineWidth = isRed ? 1.6 : 1.1;
                            ctx.stroke();

                            let tx = cx + Math.cos(rad) * (r - 13);
                            let ty = cy + Math.sin(rad) * (r - 13);
                            ctx.fillText(t.db, tx, ty + 2.5);
                        }

                        // Central "VU" Marking
                        ctx.font = "bold 11px sans-serif";
                        ctx.fillStyle = "#1e293b";
                        ctx.fillText("VU", cx, h * 0.62);
                    }
                }

                // Rotating Needle Container (Hardware-accelerated SceneGraph rotation)
                Item {
                    id: needlePivot
                    x: dialContent.width / 2
                    y: dialContent.height * 1.20
                    rotation: gauge.needleAngle

                    // Drop Shadow
                    Rectangle {
                        x: 1
                        y: -(dialContent.height * 0.98 + 2) + 2
                        width: 1.8
                        height: dialContent.height * 0.98 + 2
                        color: Qt.rgba(0, 0, 0, 0.22)
                    }

                    // Needle Arm
                    Rectangle {
                        x: -0.9
                        y: -(dialContent.height * 0.98 + 2)
                        width: 1.8
                        height: dialContent.height * 0.98 + 2
                        color: root.colorNeedle
                    }
                }

                // Pivot Center Boss Cap
                Rectangle {
                    x: dialContent.width / 2 - 12
                    y: dialContent.height * 1.20 - 12
                    width: 24; height: 24; radius: 12
                    color: "#1e293b"
                }

                Rectangle {
                    x: dialContent.width / 2 - 7
                    y: dialContent.height * 1.20 - 7
                    width: 14; height: 14; radius: 7
                    color: "#475569"
                }

                // Convex Glass Highlight
                Rectangle {
                    anchors.fill: parent
                    gradient: Gradient {
                        GradientStop { position: 0.0; color: Qt.rgba(1, 1, 1, 0.16) }
                        GradientStop { position: 0.35; color: Qt.rgba(1, 1, 1, 0.02) }
                        GradientStop { position: 0.85; color: Qt.rgba(0, 0, 0, 0.12) }
                    }
                }
            }

            // Glass Tap Interaction
            MouseArea {
                anchors.fill: parent
                onClicked: gauge.glassTapped()
            }
        }
    }

    // =========================================================================
    // MASTER CONSOLE LAYOUT (SYMMETRIC IDENTICAL-METER MATRIX)
    // Left Wing (3 Identical Meters) | Center Core | Right Wing (3 Identical Meters)
    // =========================================================================
    RowLayout {
        anchors.fill: parent
        anchors.margins: 14
        anchors.topMargin: 44
        spacing: 12

        // ---------------------------------------------------------------------
        // LEFT WING: LOW-END DYNAMICS & MASTER ACOUSTIC POWER (3 Identical Meters)
        // ---------------------------------------------------------------------
        ColumnLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            Layout.preferredWidth: 36
            spacing: 8

            // Meter 1: SUB-BASS (with BAR Ruby Lamp outside)
            VuGauge {
                id: gaugeSub
                Layout.fillWidth: true
                Layout.fillHeight: true
                title: "SUB-BASS"
                subtitle: "20 - 60 Hz"
                needleAngle: root.meterSubAngle
                hasLamp: true
                lampColor: "#ef4444"
                lampLum: root.lampRubyLum
                lampLabel: "BAR"
                onGlassTapped: root.meterSubVel += (Math.random() > 0.5 ? 40.0 : -40.0)
            }

            // Meter 2: BASS (with BEAT Amber Lamp outside)
            VuGauge {
                id: gaugeBass
                Layout.fillWidth: true
                Layout.fillHeight: true
                title: "BASS"
                subtitle: "60 - 250 Hz"
                needleAngle: root.meterBassAngle
                hasLamp: true
                lampColor: "#f59e0b"
                lampLum: root.lampAmberLum
                lampLabel: "BEAT"
                onGlassTapped: root.meterBassVel += (Math.random() > 0.5 ? 40.0 : -40.0)
            }

            // Meter 3: MASTER RMS (with READY Cobalt Lamp outside)
            VuGauge {
                id: gaugeRms
                Layout.fillWidth: true
                Layout.fillHeight: true
                title: "MASTER RMS"
                subtitle: "FULL SPECTRUM POWER"
                needleAngle: root.meterRmsAngle
                hasLamp: true
                lampColor: "#38bdf8"
                lampLum: root.lampBlueLum
                lampLabel: "READY"
                onGlassTapped: root.meterRmsVel += (Math.random() > 0.5 ? 40.0 : -40.0)
            }
        }

        // ---------------------------------------------------------------------
        // CENTER CORE: TIMEBASE, NIXIE READOUT & P1 CRT OSCILLOSCOPE
        // ---------------------------------------------------------------------
        ColumnLayout {
            Layout.preferredWidth: 28
            Layout.fillHeight: true
            Layout.alignment: Qt.AlignHCenter
            spacing: 8

            // IN-14 Cold-Cathode Nixie Tube Readout
            Rectangle {
                id: nixieHousing
                Layout.alignment: Qt.AlignHCenter
                width: 154
                height: 46
                radius: 8
                color: "#120e0a"
                border.color: "#3f2818"
                border.width: 1.5

                RowLayout {
                    anchors.centerIn: parent
                    spacing: 6

                    Repeater {
                        id: nixieRepeater
                        model: {
                            let bpmVal = (!isNaN(root.bpm) && root.bpm > 0) ? Math.max(0, Math.min(999, Math.round(root.bpm))) : 0;
                            let b = bpmVal.toString();
                            while (b.length < 3) b = "0" + b;
                            return b.split("");
                        }

                        Rectangle {
                            width: 30
                            height: 34
                            radius: 14
                            color: "#0d0703"
                            border.color: "#3f2818"
                            border.width: 1

                            // Wire mesh anode background
                            Rectangle {
                                anchors.fill: parent
                                anchors.margins: 3
                                radius: 11
                                color: "transparent"
                                border.color: "#26150a"
                                border.width: 1
                            }

                            // Glowing Neon Orange Cathode Digit
                            Text {
                                anchors.centerIn: parent
                                text: modelData
                                font.pixelSize: 19
                                font.bold: true
                                font.family: "Monospace"
                                color: "#ff7700"
                                style: Text.Outline
                                styleColor: "#ff9933"

                                Rectangle {
                                    anchors.centerIn: parent
                                    width: parent.width + 6
                                    height: parent.height + 4
                                    radius: 10
                                    color: "transparent"
                                    border.color: "#6366f1"
                                    opacity: 0.25
                                    z: -1
                                }
                            }
                        }
                    }

                    Text {
                        text: "BPM"
                        font.pixelSize: 8
                        font.bold: true
                        color: "#f59e0b"
                        opacity: 0.8
                    }
                }
            }

            // Circular Green P1 Phosphor CRT Oscilloscope
            Rectangle {
                id: scopeBezel
                Layout.alignment: Qt.AlignHCenter
                Layout.preferredWidth: Math.min(parent.width - 16, 210)
                Layout.preferredHeight: width
                radius: width / 2
                color: "#12141a"
                border.color: "#2a2d36"
                border.width: 4

                Rectangle {
                    id: scopeScreen
                    anchors.centerIn: parent
                    width: parent.width - 10
                    height: width
                    radius: width / 2
                    color: root.colorScope

                    Canvas {
                        id: scopeCanvas
                        anchors.fill: parent

                        onPaint: {
                            if (width <= 20 || height <= 20) return;
                            let ctx = getContext("2d");
                            ctx.reset();

                            let w = width;
                            let h = height;
                            let cx = w / 2;
                            let cy = h / 2;
                            let r = Math.max(2.0, w / 2 - 2);

                            ctx.save();
                            ctx.beginPath();
                            ctx.arc(cx, cy, r, 0, Math.PI * 2);
                            ctx.clip();

                            // CRT Silicate Graticule Grid
                            ctx.strokeStyle = "#194a24";
                            ctx.lineWidth = 0.75;
                            let gridStep = w / 8;
                            for (let x = gridStep; x < w; x += gridStep) {
                                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
                            }
                            for (let y = gridStep; y < h; y += gridStep) {
                                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
                            }

                            // Central Crosshairs
                            ctx.strokeStyle = "#276735";
                            ctx.lineWidth = 1.0;
                            ctx.beginPath();
                            ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
                            ctx.moveTo(0, cy); ctx.lineTo(w, cy);
                            ctx.stroke();

                            // Waveform / Lissajous Phosphor Trace
                            let time = root.simTime * root.vortexSpeed;
                            let bassAmp = root.bass * 32.0;
                            let trebleAmp = root.treble * 22.0;
                            let vocalShift = root.isVocal ? Math.sin(time * 8.0) * 10.0 : 0.0;

                            let ghosts = [
                                { alpha: 0.18, offset: -0.06, width: 3.2 },
                                { alpha: 0.35, offset: -0.03, width: 2.0 },
                                { alpha: 0.95, offset: 0.0,   width: 1.3 }
                            ];

                            for (let g = 0; g < ghosts.length; ++g) {
                                let ghost = ghosts[g];
                                ctx.strokeStyle = "rgba(74, 222, 128, " + ghost.alpha + ")";
                                ctx.lineWidth = ghost.width;
                                ctx.beginPath();

                                if (root.scopeMode === 0) {
                                    // Mode 0: Waveform Sweep locked to beatPhase
                                    let phaseOffset = root.beatPhase * Math.PI * 2.0;
                                    for (let x = 6; x < w - 6; x += 3) {
                                        let nx = (x / w) * 4.0 * Math.PI + phaseOffset;
                                        let yVal = cy + Math.sin(nx + time * 3.0 + ghost.offset) * bassAmp * 0.4
                                                      + Math.sin(nx * 2.4 - time * 5.0) * trebleAmp * 0.25
                                                      + vocalShift;
                                        if (x === 6) ctx.moveTo(x, yVal);
                                        else ctx.lineTo(x, yVal);
                                    }
                                } else {
                                    // Mode 1: Stereophonic Lissajous Phase Ellipse
                                    let points = 60;
                                    for (let i = 0; i <= points; ++i) {
                                        let theta = (i / points) * Math.PI * 2;
                                        let lx = cx + Math.sin(theta * 2.0 + time * 6.0 + ghost.offset) * (r * 0.65 + bassAmp);
                                        let ly = cy + Math.cos(theta * 3.0 + time * 4.0) * (r * 0.65 + trebleAmp);
                                        if (i === 0) ctx.moveTo(lx, ly);
                                        else ctx.lineTo(lx, ly);
                                    }
                                }
                                ctx.stroke();
                            }

                            // Convex Glass Highlight Arc
                            let glassGrad = ctx.createRadialGradient(cx * 0.75, cy * 0.65, 5, cx, cy, Math.max(6.0, r));
                            glassGrad.addColorStop(0.0, "rgba(255, 255, 255, 0.22)");
                            glassGrad.addColorStop(0.65, "rgba(255, 255, 255, 0.02)");
                            glassGrad.addColorStop(1.0, "rgba(0, 0, 0, 0.35)");
                            ctx.fillStyle = glassGrad;
                            ctx.beginPath();
                            ctx.arc(cx, cy, r, 0, Math.PI * 2);
                            ctx.fill();

                            ctx.restore();
                        }
                    }

                    MouseArea {
                        anchors.fill: parent
                        onClicked: root.scopeMode = (root.scopeMode + 1) % 2
                    }
                }
            }

            // Central Telemetry Plate
            ColumnLayout {
                Layout.alignment: Qt.AlignHCenter
                spacing: 2
                Text {
                    text: "TYPE 8-B ACOUSTIC MATRIX"
                    font.pixelSize: 8
                    font.bold: true
                    font.letterSpacing: 1.2
                    color: "#64748b"
                    Layout.alignment: Qt.AlignHCenter
                }
                Text {
                    text: "SER. 08-2026 • 6-CH DYNAMICS"
                    font.pixelSize: 7
                    color: "#475569"
                    Layout.alignment: Qt.AlignHCenter
                }
            }
        }

        // ---------------------------------------------------------------------
        // RIGHT WING: MELODIC / VOCAL & HIGH FREQUENCY (3 Identical Meters)
        // ---------------------------------------------------------------------
        ColumnLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            Layout.preferredWidth: 36
            spacing: 8

            // Meter 4: MIDS (with PRES Citrine Lamp outside)
            VuGauge {
                id: gaugeMids
                Layout.fillWidth: true
                Layout.fillHeight: true
                title: "MIDS"
                subtitle: "250 Hz - 4 kHz"
                needleAngle: root.meterMidsAngle
                hasLamp: true
                lampColor: "#eab308"
                lampLum: root.lampCitrineLum
                lampLabel: "PRES"
                onGlassTapped: root.meterMidsVel += (Math.random() > 0.5 ? 40.0 : -40.0)
            }

            // Meter 5: TREBLE (with TRANS Xenon Lamp outside)
            VuGauge {
                id: gaugeTreb
                Layout.fillWidth: true
                Layout.fillHeight: true
                title: "TREBLE"
                subtitle: "4 - 20 kHz"
                needleAngle: root.meterTrebAngle
                hasLamp: true
                lampColor: "#f8fafc"
                lampLum: root.lampWhiteLum
                lampLabel: "TRANS"
                onGlassTapped: root.meterTrebVel += (Math.random() > 0.5 ? 40.0 : -40.0)
            }

            // Meter 6: VOCAL ENERGY (with VOCAL Emerald Lamp outside)
            VuGauge {
                id: gaugeVocal
                Layout.fillWidth: true
                Layout.fillHeight: true
                title: "VOCAL ENERGY"
                subtitle: "MELODIC FORMANT"
                needleAngle: root.meterVocalAngle
                hasLamp: true
                lampColor: "#10b981"
                lampLum: root.lampEmeraldLum
                lampLabel: "VOCAL"
                onGlassTapped: root.meterVocalVel += (Math.random() > 0.5 ? 40.0 : -40.0)
            }
        }
    }
}
