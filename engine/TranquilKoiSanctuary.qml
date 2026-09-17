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
    property real waterClarity: 1.0

    // Palette Colors (Zen Japanese Pond)
    property color colorWater: "#083344"     // Deep aquamarine clear water
    property color colorPebbles: "#64748b"   // Slate riverbed stones
    property color colorCaustics: "#e0f2fe"  // Sunlight caustic ribbons
    property color colorAccent: "#f97316"    // Sakura / Golden food pellets & flora

    // Neural audio rhythm & vocal choreography
    property real beatPhase: 0.0
    property bool beat: false
    property bool downbeat: false
    property real bpm: 120.0
    property bool isVocal: false
    property real vocalEnergy: 0.0
    property bool transientHit: false

    // Aspect ratio
    readonly property real aspect: Math.max(1.0, root.width) / Math.max(1.0, root.height)

    // Forward-only integrated time
    property real koiTime: 0.0
    property real prevSimTime: 0.0

    // -------------------------------------------------------------------------
    // 1. Lily Pad Physics Simulation State (5 Non-Overlapping Pads)
    // -------------------------------------------------------------------------
    property var lilypads: [
        { anchorX: 0.22, anchorY: 0.26, x: 0.22, y: 0.26, vx: 0.0, vy: 0.0, r: 0.115, notch: 0.8, wavePhase: 0.0, waveAmp: 0.0, scale: 1.0, type: 0 },
        { anchorX: 0.78, anchorY: 0.28, x: 0.78, y: 0.28, vx: 0.0, vy: 0.0, r: 0.130, notch: -1.2, wavePhase: 0.0, waveAmp: 0.0, scale: 1.0, type: 1 },
        { anchorX: 0.28, anchorY: 0.76, x: 0.28, y: 0.76, vx: 0.0, vy: 0.0, r: 0.095, notch: 2.4, wavePhase: 0.0, waveAmp: 0.0, scale: 1.0, type: 0 },
        { anchorX: 0.75, anchorY: 0.74, x: 0.75, y: 0.74, vx: 0.0, vy: 0.0, r: 0.120, notch: 1.1, wavePhase: 0.0, waveAmp: 0.0, scale: 1.0, type: 2 },
        { anchorX: 0.48, anchorY: 0.18, x: 0.48, y: 0.18, vx: 0.0, vy: 0.0, r: 0.105, notch: -0.5, wavePhase: 0.0, waveAmp: 0.0, scale: 1.0, type: 1 }
    ]

    // -------------------------------------------------------------------------
    // 2. Active Fish Agents Pool (5 Slots with Autonomous Lifecycle)
    // -------------------------------------------------------------------------
    property var fishSlots: [
        { x: 0.35, y: 0.35, hx: 0.9, hy: 0.3, len: 0.155, phase: 0.0, variety: 0, depth: 0.0, speed: 0.065, targetX: 0.6, targetY: 0.4, lifeTime: 5.0, maxLife: 35.0, exiting: false },
        { x: 0.65, y: 0.45, hx: -0.7, hy: 0.6, len: 0.165, phase: 1.8, variety: 1, depth: 0.0, speed: 0.060, targetX: 0.4, targetY: 0.6, lifeTime: 12.0, maxLife: 40.0, exiting: false },
        { x: 0.45, y: 0.65, hx: 0.5, hy: -0.8, len: 0.145, phase: 3.2, variety: 3, depth: 0.0, speed: 0.070, targetX: 0.7, targetY: 0.3, lifeTime: 18.0, maxLife: 32.0, exiting: false },
        { x: 0.25, y: 0.55, hx: 0.8, hy: 0.2, len: 0.170, phase: 4.5, variety: 4, depth: 0.0, speed: 0.055, targetX: 0.5, targetY: 0.7, lifeTime: 2.0, maxLife: 45.0, exiting: false },
        { x: 0.75, y: 0.50, hx: -0.8, hy: -0.3, len: 0.150, phase: 2.7, variety: 5, depth: 0.0, speed: 0.062, targetX: 0.3, targetY: 0.3, lifeTime: 22.0, maxLife: 38.0, exiting: false }
    ]

    function recycleFishSlot(f) {
        var a = root.aspect;
        var side = Math.floor(Math.random() * 4);
        if (side === 0) {
            f.x = -0.16 * a;
            f.y = 0.20 + Math.random() * 0.60;
            f.hx = 1.0;
            f.hy = (Math.random() - 0.5) * 0.6;
        } else if (side === 1) {
            f.x = (1.0 + 0.16) * a;
            f.y = 0.20 + Math.random() * 0.60;
            f.hx = -1.0;
            f.hy = (Math.random() - 0.5) * 0.6;
        } else if (side === 2) {
            f.x = (0.20 + Math.random() * 0.60) * a;
            f.y = -0.16;
            f.hx = (Math.random() - 0.5) * 0.6;
            f.hy = 1.0;
        } else {
            f.x = (0.20 + Math.random() * 0.60) * a;
            f.y = 1.16;
            f.hx = (Math.random() - 0.5) * 0.6;
            f.hy = -1.0;
        }

        var hLen = Math.sqrt(f.hx * f.hx + f.hy * f.hy);
        f.hx /= Math.max(0.001, hLen);
        f.hy /= Math.max(0.001, hLen);

        f.targetX = 0.25 + Math.random() * 0.50;
        f.targetY = 0.25 + Math.random() * 0.50;
        f.variety = Math.floor(Math.random() * 12);
        f.depth = 1.0;
        f.speed = 0.050 + Math.random() * 0.035;
        f.len = 0.135 + Math.random() * 0.035;
        f.lifeTime = 0.0;
        f.maxLife = 25.0 + Math.random() * 30.0;
        f.exiting = false;
    }

    function updateLilypads(dt) {
        var a = root.aspect;
        var kAnchor = 0.32;
        var kSpring = 5.5;
        var cDamp = 0.88;

        var vocalBreath = root.isVocal ? 0.035 * Math.sin(root.koiTime * 2.5) * root.vocalEnergy : 0.0;

        for (var i = 0; i < 5; ++i) {
            var pi = lilypads[i];

            // Harmonic gentle ambient water current drift
            var driftX = 0.022 * Math.sin(root.koiTime * 0.28 + i * 1.5) + 0.012 * Math.cos(root.koiTime * 0.18 + i * 2.1);
            var driftY = 0.020 * Math.cos(root.koiTime * 0.24 + i * 1.8) + 0.010 * Math.sin(root.koiTime * 0.15 + i * 1.3);

            var anchorTargetX = (pi.anchorX + driftX) * a;
            var anchorTargetY = pi.anchorY + driftY;

            var fx = -kAnchor * (pi.x - anchorTargetX);
            var fy = -kAnchor * (pi.y - anchorTargetY);

            // Soft elastic pairwise collision repulsion (never overlap, gentle elastic bump)
            for (var j = 0; j < 5; ++j) {
                if (i === j) continue;
                var pj = lilypads[j];
                var dx = pi.x - pj.x;
                var dy = pi.y - pj.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                var rMin = (pi.r + pj.r) * 1.04;
                if (dist < rMin && dist > 0.0001) {
                    var overlap = rMin - dist;
                    var nx = dx / dist;
                    var ny = dy / dist;
                    fx += nx * overlap * kSpring;
                    fy += ny * overlap * kSpring;

                    if (overlap > 0.004) {
                        pi.waveAmp = Math.min(1.0, pi.waveAmp + overlap * 4.0);
                        pj.waveAmp = Math.min(1.0, pj.waveAmp + overlap * 4.0);
                    }
                }
            }

            pi.vx = (pi.vx + fx * dt) * Math.pow(cDamp, dt * 60.0);
            pi.vy = (pi.vy + fy * dt) * Math.pow(cDamp, dt * 60.0);
            var vSpeed = Math.sqrt(pi.vx * pi.vx + pi.vy * pi.vy);
            if (vSpeed > 0.025) {
                pi.vx = (pi.vx / vSpeed) * 0.025;
                pi.vy = (pi.vy / vSpeed) * 0.025;
            }

            pi.x += pi.vx * dt;
            pi.y += pi.vy * dt;
            pi.notch += pi.vx * dt * 0.4;

            // Radius relaxation after downbeat pulse & vocal breath
            pi.scale = Math.max(1.0, pi.scale + (1.0 - pi.scale) * (dt * 3.5)) + vocalBreath;

            // Damped outward wave packet propagation
            if (pi.waveAmp > 0.001) {
                pi.waveAmp *= Math.exp(-2.2 * dt);
                pi.wavePhase += dt * 8.5;
            } else {
                pi.waveAmp = 0.0;
            }
        }
    }

    function updateFishLifecycle(dt, forwardImpulse) {
        var a = root.aspect;
        var audioFlick = root.bass * 0.20;

        for (var i = 0; i < 5; ++i) {
            var f = fishSlots[i];
            f.lifeTime += dt;

            // Undulation cadence
            f.phase += dt * (f.speed * 42.0 + audioFlick * 0.4);

            // Lifecycle: After cruising for maxLife, steer toward an exit gate offscreen
            if (!f.exiting && f.lifeTime > f.maxLife) {
                f.exiting = true;
                var exitSide = Math.floor(Math.random() * 4);
                if (exitSide === 0) { f.targetX = -0.30; f.targetY = f.y; }
                else if (exitSide === 1) { f.targetX = 1.30; f.targetY = f.y; }
                else if (exitSide === 2) { f.targetX = f.x / a; f.targetY = -0.30; }
                else { f.targetX = f.x / a; f.targetY = 1.30; }
            }

            var targetPx = f.targetX * a;
            var targetPy = f.targetY;
            var toTargetX = targetPx - f.x;
            var toTargetY = targetPy - f.y;
            var distToTarget = Math.sqrt(toTargetX * toTargetX + toTargetY * toTargetY);

            if (distToTarget < 0.16 && !f.exiting) {
                f.targetX = 0.18 + Math.random() * 0.64;
                f.targetY = 0.18 + Math.random() * 0.64;
            }

            var steerX = (toTargetX / Math.max(0.01, distToTarget)) * 0.35;
            var steerY = (toTargetY / Math.max(0.01, distToTarget)) * 0.35;

            // Boid separation from other fish
            for (var j = 0; j < 5; ++j) {
                if (i === j) continue;
                var other = fishSlots[j];
                var ox = f.x - other.x;
                var oy = f.y - other.y;
                var oDist = Math.sqrt(ox * ox + oy * oy);
                if (oDist < 0.14 && oDist > 0.001) {
                    var push = (0.14 - oDist) / 0.14;
                    steerX += (ox / oDist) * push * 0.8;
                    steerY += (oy / oDist) * push * 0.8;
                }
            }

            // Predator avoidance (fast pointer)
            var pointerPx = root.pointerPos.x * a;
            var pointerPy = root.pointerPos.y;
            var toPointerX = f.x - pointerPx;
            var toPointerY = f.y - pointerPy;
            var pointerDist = Math.sqrt(toPointerX * toPointerX + toPointerY * toPointerY);
            var pointerSpeed = Math.sqrt(root.pointerVel.x * root.pointerVel.x + root.pointerVel.y * root.pointerVel.y);
            if (pointerDist < 0.22 && pointerSpeed > 0.05 && pointerDist > 0.001) {
                var panicPush = (0.22 - pointerDist) / 0.22 * Math.min(1.0, pointerSpeed * 3.0);
                steerX += (toPointerX / pointerDist) * panicPush * 1.8;
                steerY += (toPointerY / pointerDist) * panicPush * 1.8;
            }

            // Chemotaxis food seeking (keystroke pellets)
            if (root.keystrokeEnergy > 0.03 && !f.exiting) {
                var keyPx = root.keystrokePos.x * a;
                var keyPy = root.keystrokePos.y;
                var toFoodX = keyPx - f.x;
                var toFoodY = keyPy - f.y;
                var foodDist = Math.sqrt(toFoodX * toFoodX + toFoodY * toFoodY);
                if (foodDist > 0.01) {
                    var attract = Math.min(1.0, root.keystrokeEnergy) * 0.65;
                    steerX += (toFoodX / foodDist) * attract;
                    steerY += (toFoodY / foodDist) * attract;
                }
            }

            // Vocal centering
            if (root.isVocal && !f.exiting) {
                var centerPx = 0.5 * a;
                var centerPy = 0.5;
                var toCenterX = centerPx - f.x;
                var toCenterY = centerPy - f.y;
                var centerDist = Math.sqrt(toCenterX * toCenterX + toCenterY * toCenterY);
                if (centerDist > 0.08) {
                    steerX += (toCenterX / centerDist) * 0.25 * root.vocalEnergy;
                    steerY += (toCenterY / centerDist) * 0.25 * root.vocalEnergy;
                }
            }

            // Smooth heading interpolation
            var turnRate = 2.4 * dt;
            f.hx += steerX * turnRate;
            f.hy += steerY * turnRate;
            var hLen = Math.sqrt(f.hx * f.hx + f.hy * f.hy);
            f.hx /= Math.max(0.001, hLen);
            f.hy /= Math.max(0.001, hLen);

            // Advance position
            var effSpeed = f.speed * (1.0 + forwardImpulse) * root.vortexSpeed;
            f.x += f.hx * effSpeed * dt;
            f.y += f.hy * effSpeed * dt;

            // Submersion depth calculation
            var edgeX = Math.min(f.x, a - f.x);
            var edgeY = Math.min(f.y, 1.0 - f.y);
            var minEdge = Math.min(edgeX, edgeY);
            if (minEdge < 0.10) {
                f.depth = Math.max(0.0, Math.min(1.0, 1.0 - minEdge / 0.10));
            } else {
                f.depth = 0.0;
            }

            // Slot recycling when completely offscreen
            if (f.x < -0.22 * a || f.x > (1.0 + 0.22) * a || f.y < -0.22 || f.y > 1.22) {
                recycleFishSlot(f);
            }
        }
    }

    function pushUniforms() {
        var p0 = lilypads[0], p1 = lilypads[1], p2 = lilypads[2], p3 = lilypads[3], p4 = lilypads[4];
        koiShader.u_pad0_geo = Qt.vector4d(p0.x, p0.y, p0.r, p0.notch);
        koiShader.u_pad1_geo = Qt.vector4d(p1.x, p1.y, p1.r, p1.notch);
        koiShader.u_pad2_geo = Qt.vector4d(p2.x, p2.y, p2.r, p2.notch);
        koiShader.u_pad3_geo = Qt.vector4d(p3.x, p3.y, p3.r, p3.notch);
        koiShader.u_pad4_geo = Qt.vector4d(p4.x, p4.y, p4.r, p4.notch);

        koiShader.u_pad0_dyn = Qt.vector4d(p0.wavePhase, p0.waveAmp, p0.scale, p0.type);
        koiShader.u_pad1_dyn = Qt.vector4d(p1.wavePhase, p1.waveAmp, p1.scale, p1.type);
        koiShader.u_pad2_dyn = Qt.vector4d(p2.wavePhase, p2.waveAmp, p2.scale, p2.type);
        koiShader.u_pad3_dyn = Qt.vector4d(p3.wavePhase, p3.waveAmp, p3.scale, p3.type);
        koiShader.u_pad4_dyn = Qt.vector4d(p4.wavePhase, p4.waveAmp, p4.scale, p4.type);

        var f0 = fishSlots[0], f1 = fishSlots[1], f2 = fishSlots[2], f3 = fishSlots[3], f4 = fishSlots[4];
        koiShader.u_fish0_pos = Qt.vector4d(f0.x, f0.y, f0.hx, f0.hy);
        koiShader.u_fish1_pos = Qt.vector4d(f1.x, f1.y, f1.hx, f1.hy);
        koiShader.u_fish2_pos = Qt.vector4d(f2.x, f2.y, f2.hx, f2.hy);
        koiShader.u_fish3_pos = Qt.vector4d(f3.x, f3.y, f3.hx, f3.hy);
        koiShader.u_fish4_pos = Qt.vector4d(f4.x, f4.y, f4.hx, f4.hy);

        koiShader.u_fish0_attr = Qt.vector4d(f0.len, f0.phase, f0.variety, f0.depth);
        koiShader.u_fish1_attr = Qt.vector4d(f1.len, f1.phase, f1.variety, f1.depth);
        koiShader.u_fish2_attr = Qt.vector4d(f2.len, f2.phase, f2.variety, f2.depth);
        koiShader.u_fish3_attr = Qt.vector4d(f3.len, f3.phase, f3.variety, f3.depth);
        koiShader.u_fish4_attr = Qt.vector4d(f4.len, f4.phase, f4.variety, f4.depth);
    }

    onSimTimeChanged: {
        var dt = root.simTime - prevSimTime;
        if (dt < 0.0 || dt > 0.25) {
            dt = 0.016;
        }
        prevSimTime = root.simTime;

        var forwardImpulse = 0.0;
        if (root.beat) {
            forwardImpulse = 0.04;
        } else if (root.beatPhase > 0.0 && root.beatPhase < 0.5) {
            forwardImpulse = 0.025 * Math.sin(root.beatPhase * 2.0 * Math.PI);
        }
        koiTime += dt * (1.0 + Math.max(0.0, forwardImpulse));

        updateLilypads(dt);
        updateFishLifecycle(dt, forwardImpulse);
        pushUniforms();
    }

    // Downbeat Acoustic Resonance Trigger
    property real downbeatRipple: 0.0
    onDownbeatChanged: {
        if (downbeat) {
            downbeatAnim.restart();
            for (var k = 0; k < 5; ++k) {
                lilypads[k].waveAmp = 1.0;
                lilypads[k].wavePhase = 0.0;
                lilypads[k].scale = 1.08;
            }
        }
    }

    NumberAnimation {
        id: downbeatAnim
        target: root
        property: "downbeatRipple"
        from: 1.0
        to: 0.0
        duration: 480
        easing.type: Easing.OutCubic
    }

    Component.onCompleted: {
        for (var k = 0; k < 5; ++k) {
            lilypads[k].x = lilypads[k].anchorX * root.aspect;
            lilypads[k].y = lilypads[k].anchorY;
        }
        for (var i = 0; i < 5; ++i) {
            fishSlots[i].x *= root.aspect;
        }
        pushUniforms();
    }

    onWidthChanged: {
        for (var k = 0; k < 5; ++k) {
            if (lilypads[k].x < 0.01) {
                lilypads[k].x = lilypads[k].anchorX * root.aspect;
            }
        }
    }

    ShaderEffect {
        id: koiShader
        anchors.fill: parent

        readonly property real vocalShimmer: root.isVocal ? root.vocalEnergy * 0.08 : 0.0
        readonly property real effectiveClarity: root.waterClarity * (1.0 + vocalShimmer * 0.04)

        // Uniforms matching GLSL std140 uniform block in koi.frag
        property vector2d u_resolution: Qt.vector2d(Math.max(1.0, root.width), Math.max(1.0, root.height))
        property vector2d u_pointer: Qt.vector2d(root.pointerPos.x, root.pointerPos.y)
        property vector2d u_pointer_vel: Qt.vector2d(root.pointerVel.x, root.pointerVel.y)
        property vector2d u_keystroke_pos: Qt.vector2d(root.keystrokePos.x, root.keystrokePos.y)
        property vector2d u_keystroke_dir: Qt.vector2d(root.keystrokeDir.x, root.keystrokeDir.y)
        property vector2d u_beat_center: Qt.vector2d(root.beatCenter.x, root.beatCenter.y)
        property vector2d u_ambient_drift: Qt.vector2d(root.ambientDrift.x, root.ambientDrift.y)
        property color u_color_water: root.colorWater
        property color u_color_pebbles: root.colorPebbles
        property color u_color_caustics: Qt.rgba(Math.min(1.0, root.colorCaustics.r + vocalShimmer * 0.05), Math.min(1.0, root.colorCaustics.g + vocalShimmer * 0.07), Math.min(1.0, root.colorCaustics.b + vocalShimmer * 0.08), 1.0)
        property color u_color_accent: root.colorAccent
        property real u_time: root.koiTime
        property real u_keystroke_energy: root.keystrokeEnergy * 0.6
        property real u_shockwave_intensity: root.shockwaveIntensity * 0.3
        property real u_vortex_speed: root.vortexSpeed * 0.85
        property real u_bass: Math.min(0.20, root.bass * 0.30 + root.downbeatRipple * 0.03)
        property real u_mids: root.mids * 0.35 + vocalShimmer * 0.04
        property real u_treble: root.treble * 0.30
        property real u_water_clarity: effectiveClarity

        // 5 Lilypad Geometry & Dynamic Uniforms
        property vector4d u_pad0_geo: Qt.vector4d(0.22, 0.26, 0.115, 0.8)
        property vector4d u_pad1_geo: Qt.vector4d(0.78, 0.28, 0.130, -1.2)
        property vector4d u_pad2_geo: Qt.vector4d(0.28, 0.76, 0.095, 2.4)
        property vector4d u_pad3_geo: Qt.vector4d(0.75, 0.74, 0.120, 1.1)
        property vector4d u_pad4_geo: Qt.vector4d(0.48, 0.18, 0.105, -0.5)

        property vector4d u_pad0_dyn: Qt.vector4d(0.0, 0.0, 1.0, 0.0)
        property vector4d u_pad1_dyn: Qt.vector4d(0.0, 0.0, 1.0, 1.0)
        property vector4d u_pad2_dyn: Qt.vector4d(0.0, 0.0, 1.0, 0.0)
        property vector4d u_pad3_dyn: Qt.vector4d(0.0, 0.0, 1.0, 2.0)
        property vector4d u_pad4_dyn: Qt.vector4d(0.0, 0.0, 1.0, 1.0)

        // 5 Fish Position & Heading Uniforms
        property vector4d u_fish0_pos: Qt.vector4d(0.35, 0.35, 0.9, 0.3)
        property vector4d u_fish1_pos: Qt.vector4d(0.65, 0.45, -0.7, 0.6)
        property vector4d u_fish2_pos: Qt.vector4d(0.45, 0.65, 0.5, -0.8)
        property vector4d u_fish3_pos: Qt.vector4d(0.25, 0.55, 0.8, 0.2)
        property vector4d u_fish4_pos: Qt.vector4d(0.75, 0.50, -0.8, -0.3)

        // 5 Fish Attribute Uniforms (len, cadence, variety, depth)
        property vector4d u_fish0_attr: Qt.vector4d(0.155, 0.0, 0.0, 0.0)
        property vector4d u_fish1_attr: Qt.vector4d(0.165, 1.8, 1.0, 0.0)
        property vector4d u_fish2_attr: Qt.vector4d(0.145, 3.2, 3.0, 0.0)
        property vector4d u_fish3_attr: Qt.vector4d(0.170, 4.5, 4.0, 0.0)
        property vector4d u_fish4_attr: Qt.vector4d(0.150, 2.7, 5.0, 0.0)

        vertexShader: Qt.resolvedUrl("shaders/koi.vert.qsb")
        fragmentShader: Qt.resolvedUrl("shaders/koi.frag.qsb")
    }
}
