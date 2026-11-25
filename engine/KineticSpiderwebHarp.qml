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

    // Interactive Coordinate Mapping
    property point keystrokePos: Qt.point(0.5, 0.5)
    property point keystrokeDir: Qt.point(0.0, 1.0)
    property point beatCenter: Qt.point(0.5, 0.5)
    property point ambientDrift: Qt.point(0.0, 0.0)

    // Kinetic Silk Lattice & Acoustic Parameters
    property real tension: 1.0
    property point pluckPoint: Qt.point(0.5, 0.5)
    property real pluckAmplitude: 0.0
    property real dewDensity: 0.75
    property real chromaticDispersion: 0.85
    property real shatterProgress: 0.0

    // Dynamic Droplet Physics Controls (calm meditative defaults)
    property real condensationRate: 0.35
    property real silkFriction: 0.65
    property real vibrationSensitivity: 0.55

    // Neural audio rhythm & vocal choreography
    property real beatPhase: 0.0
    property bool beat: false
    property bool downbeat: false
    property real bpm: 120.0
    property bool isVocal: false
    property real vocalEnergy: 0.0
    property bool transientHit: false

    // Noise-gated acoustic energy (idle defaults are bass=0.08, mids=0.05, treble=0.05)
    readonly property real gatedBass: Math.max(0.0, (root.bass - 0.11) / 0.89)
    readonly property real gatedMids: Math.max(0.0, (root.mids - 0.09) / 0.91)
    readonly property real gatedTreble: Math.max(0.0, (root.treble - 0.09) / 0.91)
    readonly property real audioActivity: Math.min(1.0, Math.max(gatedBass, Math.max(gatedMids, gatedTreble)))

    // Damped physical impulse state (decays cleanly to 0 in silence)
    property real beatImpulse: 0.0

    onBeatChanged: {
        if (beat && audioActivity > 0.02) {
            root.beatImpulse = Math.min(1.0, Math.max(root.beatImpulse, 0.55 + 0.45 * gatedBass))
        }
    }

    onDownbeatChanged: {
        if (downbeat && audioActivity > 0.02) {
            root.beatImpulse = 1.0
            root.pluck(0.5, 0.5, 0.65 + 0.35 * gatedBass)
        }
    }

    onTransientHitChanged: {
        if (transientHit && audioActivity > 0.02) {
            root.pluck(0.2 + 0.6 * Math.random(), 0.2 + 0.6 * Math.random(), 0.55)
        }
    }

    onPointerVelChanged: {
        var spd = Math.hypot(pointerVel.x, pointerVel.y)
        if (spd > 0.02) {
            root.pluck(pointerPos.x, pointerPos.y, Math.min(0.85, spd * 1.6))
        }
    }

    // Palette Colors (Silk, Dew, Resonance, Void)
    property color colorSilk: "#e2e8f0"
    property color colorDew: "#67e8f9"
    property color colorResonance: "#38bdf8"
    property color colorVoid: "#050814"

    readonly property var harpPalettes: [
        {
            name: "Moonlit Gossamer (Ethereal Silver & Dewdrop Diamond)",
            silk: "#e2e8f0",
            dew: "#67e8f9",
            resonance: "#38bdf8",
            voidColor: "#050814"
        },
        {
            name: "Golden Laser Harp (Warm Amber & Radiant Topaz)",
            silk: "#fef08a",
            dew: "#facc15",
            resonance: "#f59e0b",
            voidColor: "#0c0a00"
        },
        {
            name: "Bioluminescent Abyssal (Deep Emerald & Sea Green)",
            silk: "#a7f3d0",
            dew: "#34d399",
            resonance: "#10b981",
            voidColor: "#022c22"
        },
        {
            name: "Electric Synapse (Neon Magenta & Plasma Violet)",
            silk: "#f472b6",
            dew: "#ec4899",
            resonance: "#a855f7",
            voidColor: "#18021a"
        },
        {
            name: "Frost Crystal Web (Ice Blue & Prismatic Rime)",
            silk: "#f0f9ff",
            dew: "#bae6fd",
            resonance: "#7dd3fc",
            voidColor: "#021220"
        }
    ]

    property int currentPaletteIndex: 0

    function setHarpPalette(idx) {
        if (idx < 0 || idx >= harpPalettes.length) return
        currentPaletteIndex = idx
        var p = harpPalettes[idx]
        colorSilk = Qt.color(p.silk)
        colorDew = Qt.color(p.dew)
        colorResonance = Qt.color(p.resonance)
        colorVoid = Qt.color(p.voidColor)
    }

    function pluck(px, py, amp) {
        pluckPoint = Qt.point(px, py)
        pluckAmplitude = Math.max(pluckAmplitude, amp)
    }

    // ------------------------------------------------------------------------
    // Stateful Droplet Physics Engine (320 physical droplets via 80x32 polar grid)
    // Mirrors exact web geometry from harp.frag for pixel-accurate strand seating
    // ------------------------------------------------------------------------
    readonly property int maxDrops: 420
    readonly property int maxFalling: 16
    readonly property int maxWaves: 6
    readonly property int numRadials: 20
    readonly property int numRings: 32
    property var dropPool: []
    property var wavePool: []
    property int nextWaveSlot: 0
    property bool dropsInitialized: false

    function fract(x) {
        return x - Math.floor(x)
    }

    function hash11(p) {
        p = fract(p * 0.1031)
        p *= p + 33.33
        p *= p + p
        return fract(p)
    }

    function hash22(px, py) {
        var p3x = fract(px * 0.1031)
        var p3y = fract(py * 0.1030)
        var p3z = fract(px * 0.0973)
        var d = p3x * (p3y + 33.33) + p3y * (p3z + 33.33) + p3z * (p3x + 33.33)
        p3x += d; p3y += d; p3z += d
        return [
            -1.0 + 2.0 * fract((p3x + p3y) * p3z),
            -1.0 + 2.0 * fract((p3x + p3z) * p3y)
        ]
    }

    function modPos(x, m) {
        return ((x % m) + m) % m
    }

    function noise2D(px, py) {
        var ix = Math.floor(px)
        var iy = Math.floor(py)
        var fx = px - ix
        var fy = py - iy
        var ux = fx * fx * (3.0 - 2.0 * fx)
        var uy = fy * fy * (3.0 - 2.0 * fy)
        var h00 = hash22(modPos(ix, 256.0), modPos(iy, 256.0))
        var h10 = hash22(modPos(ix + 1.0, 256.0), modPos(iy, 256.0))
        var h01 = hash22(modPos(ix, 256.0), modPos(iy + 1.0, 256.0))
        var h11 = hash22(modPos(ix + 1.0, 256.0), modPos(iy + 1.0, 256.0))
        var a = h00[0] * fx + h00[1] * fy
        var b = h10[0] * (fx - 1.0) + h10[1] * fy
        var c = h01[0] * fx + h01[1] * (fy - 1.0)
        var d = h11[0] * (fx - 1.0) + h11[1] * (fy - 1.0)
        var ab = a + (b - a) * ux
        var cd = c + (d - c) * ux
        return ab + (cd - ab) * uy
    }

    function evalWindOffset(px, py, t, tens) {
        var tau = 6.28318530
        var g1 = Math.sin(modPos(t * 0.17 + 0.4, tau))
        var g2 = Math.sin(modPos(t * 0.29 + 1.9, tau))
        var g3 = Math.sin(modPos(t * 0.11 + 3.7, tau))
        var gustRaw = Math.max(0.0, Math.min(1.0, 0.5 + 0.28 * g1 + 0.16 * g2 + 0.14 * g3))
        var gustEnv = 0.30 + 0.70 * gustRaw
        var windAngle = 0.35 + 0.55 * Math.sin(modPos(t * 0.073, tau)) + 0.30 * Math.cos(modPos(t * 0.131, tau))
        var wdx = Math.cos(windAngle)
        var wdy = Math.sin(windAngle)
        var wpx = -wdy
        var wpy = wdx
        var travel = (px * wdx + py * wdy) * 1.9 - modPos(t * 0.52, 256.0)
        var breeze = noise2D(travel, (px * wpx + py * wpy) * 1.2 + modPos(t * 0.14, 256.0))
        var crossFlutter = noise2D(px * 2.4 + modPos(t * 0.21, 256.0), py * 2.4 - modPos(t * 0.16, 256.0))
        var r2 = px * px + py * py
        var tetherMask = Math.exp(-r2 * 1.15)
        var invTension = 1.0 / Math.max(0.55, 0.55 + tens * 0.45)
        var sx = (wdx * (0.016 + 0.022 * breeze) + wpx * (0.012 * crossFlutter)) * gustEnv * tetherMask * invTension
        var sy = (wdy * (0.016 + 0.022 * breeze) + wpy * (0.012 * crossFlutter)) * gustEnv * tetherMask * invTension
        return { x: sx, y: sy, gust: gustEnv }
    }

    function getSpokeAngle(idx) {
        var wrappedIdx = ((idx % numRadials) + numRadials) % numRadials
        var stepA = 6.28318530 / numRadials
        var jitter = (hash11(wrappedIdx * 7.13 + 1.7) - 0.5) * stepA * 0.24
        return (wrappedIdx + 0.5) * stepA - 3.14159265 + jitter
    }

    function getSpanAngle(spokeIdx) {
        var a0 = getSpokeAngle(spokeIdx)
        var a1 = getSpokeAngle((spokeIdx + 1) % numRadials)
        var diff = a1 - a0
        while (diff < 0.0) diff += 6.28318530
        while (diff > 6.28318530) diff -= 6.28318530
        return Math.max(0.08, diff)
    }

    function getSpiralSpacing(tens) {
        return 0.028 * (0.92 + tens * 0.08)
    }

    function spiralIndexToRadius(k, spacing) {
        var kPos = Math.max(0.0, k)
        var baseR = 0.078 + spacing * (kPos * 0.78 + 0.018 * kPos * kPos)
        var jitter = (hash11(kPos * 13.7 + 4.3) - 0.5) * spacing * 0.14
        return baseR + jitter
    }

    function radiusToSpiralIndex(r, spacing) {
        var u = Math.max(0.0, (r - 0.078) / Math.max(spacing, 0.001))
        var disc = 0.78 * 0.78 + 4.0 * 0.018 * u
        return (-0.78 + Math.sqrt(disc)) / (2.0 * 0.018)
    }

    function spiralPoint(spokeIdx, k, u, tens) {
        var a0 = getSpokeAngle(spokeIdx)
        var span = getSpanAngle(spokeIdx)
        var spacing = getSpiralSpacing(tens)
        var ringR = spiralIndexToRadius(k, spacing)
        var sagCoeff = span * (0.14 + 0.09 / Math.max(0.55, 0.45 + tens * 0.55))
        var angle = a0 + u * span
        var catArc = 4.0 * u * (1.0 - u)
        var r = ringR / (1.0 + sagCoeff * catArc)
        return { x: Math.cos(angle) * r, y: Math.sin(angle) * r, r: r }
    }

    function spiralTangent(spokeIdx, k, u, tens) {
        var eps = 0.005
        var u0 = Math.max(0.0, u - eps)
        var u1 = Math.min(1.0, u + eps)
        var p0 = spiralPoint(spokeIdx, k, u0, tens)
        var p1 = spiralPoint(spokeIdx, k, u1, tens)
        var dx = p1.x - p0.x
        var dy = p1.y - p0.y
        var len = Math.hypot(dx, dy)
        if (len < 1e-6) return { tx: 1.0, ty: 0.0, arcLen: 0.02 }
        return { tx: dx / len, ty: dy / len, arcLen: len / Math.max(1e-5, u1 - u0) }
    }

    function getHub(aspect) {
        return {
            x: 0.05 * aspect + root.ambientDrift.x * 0.08,
            y: 0.03 + root.ambientDrift.y * 0.08
        }
    }

    function angleDiffSigned(a, b) {
        return modPos(a - b + 3.14159265, 6.28318530) - 3.14159265
    }

    function findSector(phi) {
        var stepA = 6.28318530 / numRadials
        var approxIdx = Math.floor((phi + 3.14159265) / stepA)
        var bestRight = ((approxIdx % numRadials) + numRadials) % numRadials
        var minPos = 10.0
        var minNeg = 10.0
        for (var off = -2; off <= 2; ++off) {
            var idx = ((approxIdx + off) % numRadials + numRadials) % numRadials
            var dAng = angleDiffSigned(phi, getSpokeAngle(idx))
            if (dAng >= 0.0 && dAng < minPos) {
                minPos = dAng
                bestRight = idx
            }
            if (dAng < 0.0 && -dAng < minNeg) {
                minNeg = -dAng
            }
        }
        var span = Math.max(0.08, minPos + minNeg)
        var u = Math.max(0.0, Math.min(1.0, minPos / span))
        return { spokeIdx: bestRight, u: u, span: span }
    }

    function initWaves() {
        var wp = []
        for (var i = 0; i < maxWaves; ++i) {
            wp.push({ ox: 0.0, oy: 0.0, amp: 0.0, age: -1.0 })
        }
        wavePool = wp
        nextWaveSlot = 0
    }

    function spawnWave(ox, oy, signedAmp) {
        if (wavePool.length !== maxWaves) initWaves()
        if (Math.abs(signedAmp) < 0.0003) return
        // Prefer an inactive slot, otherwise overwrite oldest/ring slot
        var slot = -1
        for (var i = 0; i < maxWaves; ++i) {
            if (wavePool[i].age <= 0.0) {
                slot = i
                break
            }
        }
        if (slot === -1) {
            slot = nextWaveSlot
            nextWaveSlot = (nextWaveSlot + 1) % maxWaves
        }
        wavePool[slot].ox = ox
        wavePool[slot].oy = oy
        wavePool[slot].amp = signedAmp
        wavePool[slot].age = 0.001
    }

    function stepWaves(dt) {
        if (wavePool.length !== maxWaves) initWaves()
        for (var i = 0; i < maxWaves; ++i) {
            var w = wavePool[i]
            if (w.age > 0.0) {
                w.age += dt
                if (w.age > 1.8) {
                    w.age = -1.0
                    w.amp = 0.0
                }
            }
        }
    }

    function evalWaveVibAt(lx, ly, tens) {
        if (wavePool.length !== maxWaves) return 0.0
        var cWave = 0.55 * Math.sqrt(Math.max(0.4, tens))
        var vib = 0.0
        for (var i = 0; i < maxWaves; ++i) {
            var w = wavePool[i]
            if (w.age <= 0.0 || Math.abs(w.amp) < 0.0002) continue
            var dist = Math.hypot(lx - w.ox, ly - w.oy)
            var rFront = cWave * w.age
            var diff = (dist - rFront) / 0.085
            var env = Math.exp(-diff * diff) * Math.exp(-w.age * 2.4) * Math.exp(-dist * 1.8)
            vib += Math.abs(w.amp) * env * 42.0
        }
        return vib
    }

    function setWaveUniform(idx, v) {
        switch (idx) {
        case 0: harpShader.u_wave0 = v; break
        case 1: harpShader.u_wave1 = v; break
        case 2: harpShader.u_wave2 = v; break
        case 3: harpShader.u_wave3 = v; break
        case 4: harpShader.u_wave4 = v; break
        case 5: harpShader.u_wave5 = v; break
        }
    }

    function syncAllWaveUniforms() {
        for (var i = 0; i < maxWaves; ++i) {
            var w = wavePool[i]
            if (!w || w.age <= 0.0) {
                setWaveUniform(i, Qt.vector4d(0.0, 0.0, 0.0, -1.0))
            } else {
                setWaveUniform(i, Qt.vector4d(w.ox, w.oy, w.amp, w.age))
            }
        }
    }

    function detachDrop(d, hub, tens) {
        var localX = d.x
        var localY = d.y
        var invTens = 1.0 / Math.max(0.55, 0.50 + tens * 0.50)
        // Account for static weight sag so detachment is visually seamless as the thread snaps up!
        var mSag = Math.pow(d.radius / 0.010, 3.0)
        var staticSag = Math.min(0.014, 0.0042 * mSag) * invTens
        // Launch upward (+Y) elastic recoil wave from the release point
        var recoilAmp = Math.min(0.016, 0.0048 * Math.pow(d.radius / 0.008, 2.5)) * invTens
        spawnWave(localX, localY, recoilAmp)

        var sx = hub.x + localX
        var sy = hub.y + localY - staticSag
        var w = evalWindOffset(sx, sy, root.simTime, tens)
        d.mode = "falling"
        d.pinned = false
        d.x = sx + w.x
        d.y = sy + w.y
        d.vx = w.x * 0.35
        d.vy = -Math.max(0.035, Math.abs(d.speed) * 0.35)
        d.speed = 0.0
        d.fallAge = 0.0
    }

    function createEmptyDrop() {
        return {
            active: false,
            mode: "radial",
            pinned: true,
            spokeIdx: 0,
            r: 0.2,
            k: 4,
            u: 0.5,
            speed: 0.0,
            x: 0.0,
            y: 0.0,
            prevX: 0.0,
            prevY: 0.0,
            vx: 0.0,
            vy: 0.0,
            radius: 0.005,
            lastKnotK: -1,
            cooldown: 0.0,
            fallAge: 0.0
        }
    }

    function sampleRandomWebPoint(tens) {
        var aspect = (root.height > 10 && root.width > 10) ? (root.width / root.height) : (16.0 / 9.0)
        var hub = getHub(aspect)
        var spacing = getSpiralSpacing(tens)
        var onSpiral = (Math.random() < 0.50)
        var spoke = 0
        var k = 4
        var uVal = 0.5
        var px = 0.0
        var py = 0.0
        var pr = 0.2

        // Rejection-sample within the visible viewport anywhere along spokes or spirals
        for (var attempt = 0; attempt < 16; ++attempt) {
            spoke = Math.floor(Math.random() * numRadials)
            k = 1 + Math.floor(Math.random() * 29) // rings 1..29 (covers full 16:9 viewport)
            if (onSpiral) {
                uVal = 0.05 + Math.random() * 0.90
                var ptTry = spiralPoint(spoke, k, uVal, tens)
                px = ptTry.x; py = ptTry.y; pr = ptTry.r
            } else {
                // Spawn anywhere along the radial spoke (not just knots)
                var rMin = spiralIndexToRadius(1, spacing)
                var rMax = spiralIndexToRadius(29, spacing)
                pr = rMin + Math.random() * (rMax - rMin)
                k = Math.max(1, Math.min(numRings - 2, Math.round(radiusToSpiralIndex(pr, spacing))))
                var aTry = getSpokeAngle(spoke)
                px = Math.cos(aTry) * pr
                py = Math.sin(aTry) * pr
            }
            var sx = hub.x + px
            var sy = hub.y + py
            if (Math.abs(sx) < aspect * 0.48 && Math.abs(sy) < 0.47) {
                break
            }
        }
        return { onSpiral: onSpiral, spoke: spoke, k: k, u: uVal, x: px, y: py, r: pr }
    }

    function spawnDropInSlot(d, initialSeed, tens) {
        var pt = sampleRandomWebPoint(tens)
        d.active = true
        d.pinned = true
        d.speed = 0.0
        d.vx = 0.0
        d.vy = 0.0
        d.spokeIdx = pt.spoke
        d.k = pt.k
        d.lastKnotK = pt.onSpiral ? -1 : pt.k
        d.cooldown = initialSeed ? (0.4 + Math.random() * 2.5) : (0.5 + Math.random() * 1.4)
        d.mode = pt.onSpiral ? "spiral" : "radial"
        d.u = pt.u
        d.x = pt.x
        d.y = pt.y
        d.prevX = pt.x
        d.prevY = pt.y
        d.r = pt.r
        d.fallAge = 0.0

        if (initialSeed) {
            var sr = Math.random()
            // Mostly delicate morning-dew pearls with a few larger coalesced beads
            d.radius = 0.0029 + (sr * sr * sr) * 0.0068 // 0.0029 .. 0.0097
        } else {
            d.radius = 0.0029 + Math.random() * 0.0015 // fresh condensation bead
        }
    }

    function tryMergePair(da, db, hub, tens, invTens, emitWaves) {
        var aFall = (da.mode === "falling")
        var bFall = (db.mode === "falling")
        var ax0, ay0, ax1, ay1, bx0, by0, bx1, by1
        if (!aFall && !bFall) {
            ax0 = da.prevX; ay0 = da.prevY; ax1 = da.x; ay1 = da.y
            bx0 = db.prevX; by0 = db.prevY; bx1 = db.x; by1 = db.y
        } else {
            if (aFall) {
                ax0 = da.prevX; ay0 = da.prevY; ax1 = da.x; ay1 = da.y
            } else {
                var wa = evalWindOffset(hub.x + da.x, hub.y + da.y, root.simTime, tens)
                ax0 = hub.x + da.prevX + wa.x; ay0 = hub.y + da.prevY + wa.y
                ax1 = hub.x + da.x + wa.x;     ay1 = hub.y + da.y + wa.y
            }
            if (bFall) {
                bx0 = db.prevX; by0 = db.prevY; bx1 = db.x; by1 = db.y
            } else {
                var wb = evalWindOffset(hub.x + db.x, hub.y + db.y, root.simTime, tens)
                bx0 = hub.x + db.prevX + wb.x; by0 = hub.y + db.prevY + wb.y
                bx1 = hub.x + db.x + wb.x;     by1 = hub.y + db.y + wb.y
            }
        }

        // Exact swept closest-approach distance during the frame (zero tunneling!)
        var rx0 = ax0 - bx0
        var ry0 = ay0 - by0
        var drx = (ax1 - bx1) - rx0
        var dry = (ay1 - by1) - ry0
        var len2 = drx * drx + dry * dry
        var s = (len2 > 1e-10) ? Math.max(0.0, Math.min(1.0, -(rx0 * drx + ry0 * dry) / len2)) : 0.0
        var cx = rx0 + s * drx
        var cy = ry0 + s * dry
        var touchR = (da.radius + db.radius) * 1.08

        if (cx * cx + cy * cy <= touchR * touchR) {
            var aWins = false
            if (aFall && !bFall) aWins = true
            else if (bFall && !aFall) aWins = false
            else if (!da.pinned && db.pinned) aWins = true
            else if (da.pinned && !db.pinned) aWins = false
            else aWins = (da.radius >= db.radius)

            var surv = aWins ? da : db
            var eaten = aWins ? db : da

            var r1 = surv.radius
            var r2 = eaten.radius
            // Conserve 2D silhouette area (sqrt(r1^2 + r2^2)) so merged droplets visibly grow on screen
            surv.radius = Math.min(0.0195, Math.hypot(r1, r2))
            eaten.active = false
            surv.cooldown = 0.0

            if (surv.mode !== "falling") {
                if (!eaten.pinned && surv.pinned) {
                    surv.pinned = false
                    surv.speed = eaten.speed * 0.85
                } else if (!surv.pinned) {
                    surv.speed *= 1.12
                }
                if (emitWaves) {
                    var mergeAmp = Math.min(0.008, 0.0024 * Math.pow(surv.radius / 0.009, 2.0)) * invTens
                    spawnWave(surv.x, surv.y, -mergeAmp)
                }
            } else {
                surv.vy -= 0.04
            }
            return true
        }
        return false
    }

    function mergeTouchingDrops(hub, tens, invTens, emitWaves) {
        var spacing = getSpiralSpacing(tens)
        var totalCells = numRadials * numRings
        var buckets = new Array(totalCells)
        var fallingIndices = []

        var passes = 0
        var mergedAny = true
        while (mergedAny && passes < 5) {
            mergedAny = false
            passes++

            for (var c = 0; c < totalCells; ++c) buckets[c] = null
            fallingIndices.length = 0

            // Bin all active drops into the 20x32 polar spatial grid (O(N))
            for (var i = 0; i < maxDrops; ++i) {
                var d = dropPool[i]
                if (!d.active) continue
                if (d.mode === "falling") {
                    fallingIndices.push(i)
                } else {
                    var kCell = (d.mode === "spiral")
                        ? Math.max(0, Math.min(numRings - 1, d.k))
                        : Math.max(0, Math.min(numRings - 1, Math.floor(radiusToSpiralIndex(d.r, spacing))))
                    var sCell = ((d.spokeIdx % numRadials) + numRadials) % numRadials
                    var bKey = sCell * numRings + kCell
                    if (!buckets[bKey]) buckets[bKey] = [i]
                    else buckets[bKey].push(i)
                }
            }

            // 1. On-web drops check their 3x3 polar cell neighborhood
            for (var s0 = 0; s0 < numRadials; ++s0) {
                for (var k0 = 0; k0 < numRings; ++k0) {
                    var listA = buckets[s0 * numRings + k0]
                    if (!listA) continue
                    for (var ia = 0; ia < listA.length; ++ia) {
                        var idxA = listA[ia]
                        var da = dropPool[idxA]
                        if (!da.active) continue
                        for (var ds = -1; ds <= 1; ++ds) {
                            var s1 = (s0 + ds + numRadials) % numRadials
                            for (var dk = -1; dk <= 1; ++dk) {
                                var k1 = k0 + dk
                                if (k1 < 0 || k1 >= numRings) continue
                                var listB = buckets[s1 * numRings + k1]
                                if (!listB) continue
                                for (var ib = 0; ib < listB.length; ++ib) {
                                    var idxB = listB[ib]
                                    if (idxB <= idxA) continue
                                    var db = dropPool[idxB]
                                    if (!db.active) continue
                                    if (tryMergePair(da, db, hub, tens, invTens, emitWaves)) {
                                        mergedAny = true
                                        if (!da.active) break
                                    }
                                }
                                if (!da.active) break
                            }
                            if (!da.active) break
                        }
                    }
                }
            }

            // 2. Falling drops check nearby polar cells + other falling drops
            for (var fi = 0; fi < fallingIndices.length; ++fi) {
                var fIdx = fallingIndices[fi]
                var df = dropPool[fIdx]
                if (!df.active) continue

                // Against other falling drops
                for (var fj = fi + 1; fj < fallingIndices.length; ++fj) {
                    var df2 = dropPool[fallingIndices[fj]]
                    if (!df2.active) continue
                    if (tryMergePair(df, df2, hub, tens, invTens, emitWaves)) {
                        mergedAny = true
                        if (!df.active) break
                    }
                }
                if (!df.active) continue

                // Against nearby on-web drops in 3x3 polar neighborhood
                var wf = evalWindOffset(df.x, df.y, root.simTime, tens)
                var flx = df.x - wf.x - hub.x
                var fly = df.y - wf.y - hub.y
                var fr = Math.hypot(flx, fly)
                if (fr > 0.06 && fr < 1.25) {
                    var fSec = findSector(Math.atan2(fly, flx))
                    var fk = Math.max(0, Math.min(numRings - 1, Math.floor(radiusToSpiralIndex(fr, spacing))))
                    for (var fds = -1; fds <= 1; ++fds) {
                        var fs = (fSec.spokeIdx + fds + numRadials) % numRadials
                        for (var fdk = -1; fdk <= 1; ++fdk) {
                            var fk1 = fk + fdk
                            if (fk1 < 0 || fk1 >= numRings) continue
                            var flist = buckets[fs * numRings + fk1]
                            if (!flist) continue
                            for (var fib = 0; fib < flist.length; ++fib) {
                                var dw = dropPool[flist[fib]]
                                if (!dw.active) continue
                                if (tryMergePair(df, dw, hub, tens, invTens, emitWaves)) {
                                    mergedAny = true
                                    if (!df.active) break
                                }
                            }
                            if (!df.active) break
                        }
                        if (!df.active) break
                    }
                }
            }
        }
    }

    function initDroplets() {
        var pool = []
        var aspect = (root.height > 10 && root.width > 10) ? (root.width / root.height) : (16.0 / 9.0)
        var hub = getHub(aspect)
        var tens = harpShader.effectiveTension
        var invTens = 1.0 / Math.max(0.55, 0.50 + tens * 0.50)
        var initialCount = Math.round(35 + 215 * Math.max(0.0, Math.min(1.0, root.dewDensity)))
        for (var i = 0; i < maxDrops; ++i) {
            var d = createEmptyDrop()
            if (i < initialCount && root.dewDensity > 0.02) {
                spawnDropInSlot(d, true, tens)
            }
            pool.push(d)
        }
        dropPool = pool
        initWaves()
        mergeTouchingDrops(hub, tens, invTens, false)
        dropsInitialized = true
        syncAllDropUniforms()
        syncAllWaveUniforms()
    }

    function setFallUniform(idx, v) {
        switch (idx) {
        case 0: harpShader.u_fall0 = v; break
        case 1: harpShader.u_fall1 = v; break
        case 2: harpShader.u_fall2 = v; break
        case 3: harpShader.u_fall3 = v; break
        case 4: harpShader.u_fall4 = v; break
        case 5: harpShader.u_fall5 = v; break
        case 6: harpShader.u_fall6 = v; break
        case 7: harpShader.u_fall7 = v; break
        case 8: harpShader.u_fall8 = v; break
        case 9: harpShader.u_fall9 = v; break
        case 10: harpShader.u_fall10 = v; break
        case 11: harpShader.u_fall11 = v; break
        case 12: harpShader.u_fall12 = v; break
        case 13: harpShader.u_fall13 = v; break
        case 14: harpShader.u_fall14 = v; break
        case 15: harpShader.u_fall15 = v; break
        }
    }

    function syncAllDropUniforms() {
        var tens = harpShader.effectiveTension
        var spacing = getSpiralSpacing(tens)
        var W = 80
        var H = numRings
        var bytes = dropGridCanvas.gridBytes
        if (!bytes || bytes.length !== W * H * 4) {
            bytes = new Uint8Array(W * H * 4)
            dropGridCanvas.gridBytes = bytes
        }
        // Clear R, G, B to 0 and keep A = 255 (opaque so Canvas premultiplied alpha never alters RGB!)
        for (var p = 0; p < bytes.length; p += 4) {
            bytes[p] = 0
            bytes[p + 1] = 0
            bytes[p + 2] = 0
            bytes[p + 3] = 255
        }

        var fallSlot = 0
        for (var i = 0; i < maxDrops; ++i) {
            var d = dropPool[i]
            if (!d || !d.active) continue
            if (d.mode === "falling") {
                if (fallSlot < maxFalling) {
                    var fallSpd = Math.max(0.01, Math.min(1.5, Math.abs(d.vy)))
                    setFallUniform(fallSlot, Qt.vector4d(d.x, d.y, d.radius, fallSpd))
                    fallSlot++
                }
            } else {
                var sCell = ((d.spokeIdx % numRadials) + numRadials) % numRadials
                var kCell, paramVal, baseSlot
                if (d.mode === "radial") {
                    kCell = Math.max(0, Math.min(H - 1, Math.floor(radiusToSpiralIndex(d.r, spacing))))
                    var r0 = spiralIndexToRadius(kCell, spacing)
                    var r1 = spiralIndexToRadius(kCell + 1, spacing)
                    paramVal = Math.max(0.0, Math.min(1.0, (d.r - r0) / Math.max(0.001, r1 - r0)))
                    baseSlot = 0
                } else {
                    kCell = Math.max(0, Math.min(H - 1, d.k))
                    paramVal = Math.max(0.0, Math.min(1.0, d.u))
                    baseSlot = 2
                }
                var rByte = Math.max(0, Math.min(255, Math.round(paramVal * 255.0)))
                var gByte = Math.max(1, Math.min(255, Math.round((d.radius / 0.020) * 255.0)))
                var idx0 = (kCell * W + sCell * 4 + baseSlot) * 4
                var idx1 = (kCell * W + sCell * 4 + baseSlot + 1) * 4
                if (bytes[idx0 + 1] === 0) {
                    bytes[idx0] = rByte
                    bytes[idx0 + 1] = gByte
                } else if (bytes[idx1 + 1] === 0) {
                    bytes[idx1] = rByte
                    bytes[idx1 + 1] = gByte
                } else if (gByte > bytes[idx1 + 1]) {
                    bytes[idx1] = rByte
                    bytes[idx1 + 1] = gByte
                }
            }
        }
        while (fallSlot < maxFalling) {
            setFallUniform(fallSlot, Qt.vector4d(0.0, 0.0, -1.0, 0.0))
            fallSlot++
        }
        dropGridCanvas.requestPaint()
    }

    function stepDroplets(dt) {
        if (!dropsInitialized || dropPool.length !== maxDrops) {
            initDroplets()
            return
        }

        var aspect = (root.height > 10 && root.width > 10) ? (root.width / root.height) : (16.0 / 9.0)
        var hub = getHub(aspect)
        var tens = harpShader.effectiveTension
        var invTens = 1.0 / Math.max(0.55, 0.50 + tens * 0.50)
        var spacing = getSpiralSpacing(tens)
        stepWaves(dt)
        var friction = Math.max(0.05, Math.min(1.0, root.silkFriction))
        var condRate = Math.max(0.0, Math.min(1.0, root.condensationRate))
        var vibGain = 0.15 + 1.55 * Math.max(0.0, Math.min(1.0, root.vibrationSensitivity))

        // Ambient wind gust envelope (synced with shader)
        var tau = 6.28318530
        var g1 = Math.sin(modPos(root.simTime * 0.17 + 0.4, tau))
        var g2 = Math.sin(modPos(root.simTime * 0.29 + 1.9, tau))
        var g3 = Math.sin(modPos(root.simTime * 0.11 + 3.7, tau))
        var windGust = 0.30 + 0.70 * Math.max(0.0, Math.min(1.0, 0.5 + 0.28 * g1 + 0.16 * g2 + 0.14 * g3))

        var audioVib = root.gatedBass * 0.95 + root.beatImpulse * 0.85 + root.gatedMids * 0.35 + root.gatedTreble * 0.20
        var pluckX = (root.pluckPoint.x - 0.5) * aspect
        var pluckY = 0.5 - root.pluckPoint.y
        var keyX = (root.keystrokePos.x - 0.5) * aspect
        var keyY = 0.5 - root.keystrokePos.y
        var keyAng = Math.atan2(keyY - hub.y, keyX - hub.x)

        // 1. Count active droplets & nucleate new condensation beads
        var activeCount = 0
        var firstFree = -1
        for (var c = 0; c < maxDrops; ++c) {
            if (dropPool[c].active) {
                activeCount++
            } else if (firstFree === -1) {
                firstFree = c
            }
        }

        var targetCount = Math.round(40 + 340 * Math.max(0.0, Math.min(1.0, root.dewDensity)))
        if (root.dewDensity > 0.02 && condRate > 0.005) {
            var spawnRate = 0.8 + 10.5 * condRate
            if (Math.random() < spawnRate * dt) {
                if (firstFree !== -1 && activeCount < targetCount) {
                    spawnDropInSlot(dropPool[firstFree], false, tens)
                } else {
                    // Web is full: a newly condensed bead still merges if it lands touching a neighbor!
                    var cand = sampleRandomWebPoint(tens)
                    var newR = 0.0029 + Math.random() * 0.0015
                    for (var m = 0; m < maxDrops; ++m) {
                        var dm = dropPool[m]
                        if (!dm.active || dm.mode === "falling") continue
                        var mdx = cand.x - dm.x
                        var mdy = cand.y - dm.y
                        var mTouch = (dm.radius + newR) * 1.45
                        if (mdx * mdx + mdy * mdy <= mTouch * mTouch) {
                            dm.radius = Math.min(0.0195, Math.hypot(dm.radius, newR))
                            dm.cooldown = 0.0
                            break
                        }
                    }
                }
            }
        }

        // Record previous frame positions for swept zero-tunneling coalescence
        for (var pIdx = 0; pIdx < maxDrops; ++pIdx) {
            var dp = dropPool[pIdx]
            if (dp.active) {
                dp.prevX = dp.x
                dp.prevY = dp.y
            }
        }

        // 2. Step each active droplet
        for (var i = 0; i < maxDrops; ++i) {
            var d = dropPool[i]
            if (!d.active) continue

            if (d.mode === "falling") {
                var prevFX = d.x
                var prevFY = d.y
                d.fallAge += dt
                d.vy -= 1.55 * dt
                d.vx *= Math.exp(-1.5 * dt)
                d.x += d.vx * dt
                d.y += d.vy * dt
                if (d.y < -0.62 || Math.abs(d.x) > aspect * 0.65) {
                    d.active = false
                    continue
                }

                // After a brief grace window to clear the strand it left, test catching on lower silk strands
                if (d.fallAge > 0.14) {
                    var wCatch = evalWindOffset(d.x, d.y, root.simTime, tens)
                    var lx0 = prevFX - wCatch.x - hub.x
                    var ly0 = prevFY - wCatch.y - hub.y
                    var lx1 = d.x - wCatch.x - hub.x
                    var ly1 = d.y - wCatch.y - hub.y
                    var r0 = Math.hypot(lx0, ly0)
                    var r1 = Math.hypot(lx1, ly1)

                    if (r1 > 0.08 && r1 < 1.05) {
                        var fallMass = Math.pow(d.radius / 0.0078, 3.0)
                        var fallSpd = Math.abs(d.vy)
                        var phi0 = Math.atan2(ly0, lx0)
                        var phi1 = Math.atan2(ly1, lx1)

                        // A) Capture spiral strand crossing check
                        var sec0 = findSector(phi0)
                        var sec1 = findSector(phi1)
                        var sagCoeff0 = sec0.span * (0.14 + 0.09 / Math.max(0.55, 0.45 + tens * 0.55))
                        var sagCoeff1 = sec1.span * (0.14 + 0.09 / Math.max(0.55, 0.45 + tens * 0.55))
                        var sagR0 = r0 * (1.0 + sagCoeff0 * 4.0 * sec0.u * (1.0 - sec0.u))
                        var sagR1 = r1 * (1.0 + sagCoeff1 * 4.0 * sec1.u * (1.0 - sec1.u))
                        var kF0 = radiusToSpiralIndex(sagR0, spacing)
                        var kF1 = radiusToSpiralIndex(sagR1, spacing)
                        var kLo = Math.ceil(Math.min(kF0, kF1))
                        var kHi = Math.floor(Math.max(kF0, kF1))

                        if (kLo <= kHi && kLo >= 1 && kLo <= 30) {
                            var kCatch = kLo
                            var uCatch = Math.max(0.03, Math.min(0.97, sec1.u))
                            var tanCatch = spiralTangent(sec1.spokeIdx, kCatch, uCatch, tens)
                            var horizSp = Math.abs(tanCatch.tx)
                            var catchProbSp = Math.min(0.72, (0.14 + 0.58 * friction) * (0.25 + 0.75 * horizSp) / (0.55 + fallMass * 0.65 + fallSpd * 1.85))
                            if (Math.random() < catchProbSp) {
                                d.mode = "spiral"
                                d.spokeIdx = sec1.spokeIdx
                                d.k = kCatch
                                d.u = uCatch
                                var ptCatch = spiralPoint(d.spokeIdx, d.k, d.u, tens)
                                d.x = ptCatch.x; d.y = ptCatch.y; d.r = ptCatch.r
                                d.lastKnotK = -1
                                var projSp = d.vy * tanCatch.ty * 0.45
                                if (Math.abs(projSp) < 0.025 || Math.random() < (0.30 + 0.45 * friction)) {
                                    d.pinned = true
                                    d.speed = 0.0
                                    d.cooldown = 0.5 + 1.1 * friction
                                } else {
                                    d.pinned = false
                                    d.speed = Math.max(-0.32, Math.min(0.32, projSp))
                                }
                                d.vx = 0.0; d.vy = 0.0; d.fallAge = 0.0
                                // Sudden downward (-Y) impact wave when catching onto a spiral thread
                                var impactSp = Math.min(0.018, (0.0038 + 0.0085 * fallSpd) * Math.pow(d.radius / 0.008, 2.2)) * invTens
                                spawnWave(d.x, d.y, -impactSp)
                                continue
                            }
                        }

                        // B) Radial spoke crossing check (diagonal / horizontal spokes)
                        var stepRad = 6.28318530 / numRadials
                        var nearSpoke = ((Math.floor((phi1 + 3.14159265) / stepRad) % numRadials) + numRadials) % numRadials
                        var bestSpokeC = -1
                        for (var rOff = -1; rOff <= 1; ++rOff) {
                            var candS = ((nearSpoke + rOff) % numRadials + numRadials) % numRadials
                            var candAng = getSpokeAngle(candS)
                            var dA0 = angleDiffSigned(phi0, candAng)
                            var dA1 = angleDiffSigned(phi1, candAng)
                            if (dA0 * dA1 <= 0.0 && Math.abs(dA0) < 0.25 && Math.abs(dA1) < 0.25) {
                                bestSpokeC = candS
                                break
                            }
                        }
                        if (bestSpokeC !== -1) {
                            var catchAng = getSpokeAngle(bestSpokeC)
                            var horizR = Math.abs(Math.cos(catchAng))
                            var catchProbR = Math.min(0.68, (0.12 + 0.52 * friction) * (0.20 + 0.80 * horizR) / (0.55 + fallMass * 0.65 + fallSpd * 1.85))
                            if (Math.random() < catchProbR) {
                                d.mode = "radial"
                                d.spokeIdx = bestSpokeC
                                d.r = r1
                                d.x = Math.cos(catchAng) * r1
                                d.y = Math.sin(catchAng) * r1
                                d.lastKnotK = -1
                                var projR = d.vy * Math.sin(catchAng) * 0.45
                                if (Math.abs(projR) < 0.025 || Math.random() < (0.30 + 0.45 * friction)) {
                                    d.pinned = true
                                    d.speed = 0.0
                                    d.cooldown = 0.5 + 1.1 * friction
                                } else {
                                    d.pinned = false
                                    d.speed = Math.max(-0.32, Math.min(0.32, projR))
                                }
                                d.vx = 0.0; d.vy = 0.0; d.fallAge = 0.0
                                // Sudden downward (-Y) impact wave when catching onto a spiral thread
                                var impactSp = Math.min(0.018, (0.0038 + 0.0085 * fallSpd) * Math.pow(d.radius / 0.008, 2.2)) * invTens
                                spawnWave(d.x, d.y, -impactSp)
                                continue
                            }
                        }
                    }
                }
                continue
            }

            // Droplets grow exclusively by combining when touching neighbors (no passive solo growth)
            if (d.cooldown > 0.0) {
                d.cooldown = Math.max(0.0, d.cooldown - dt)
            }

            // Compute local vibration intensity at this drop (including traveling elastic silk waves!)
            var screenX = hub.x + d.x
            var screenY = hub.y + d.y
            var pDist = Math.hypot(screenX - pluckX, screenY - pluckY)
            var pluckVib = Math.exp(-pDist * 5.2) * harpShader.effectivePluck * 1.45
            var dropAng = Math.atan2(d.y, d.x)
            var angDiffKey = Math.abs(modPos(dropAng - keyAng + 3.14159265, tau) - 3.14159265)
            var keyVib = Math.exp(-angDiffKey * angDiffKey * 9.0) * root.keystrokeEnergy * 1.2
            var waveVib = evalWaveVibAt(d.x, d.y, tens)
            var localVib = (windGust * 0.14 + audioVib + pluckVib + keyVib + waveVib + root.shockwaveIntensity * 2.2) * vibGain

            // Mass scales cubically with radius (normalized around r = 0.0078)
            var mass = Math.pow(d.radius / 0.0078, 3.0)

            // --- PINNED STATE: evaluate depinning (slide) or direct hang drop ---
            if (d.pinned) {
                var tx = 0.0
                var ty = 0.0
                if (d.mode === "radial") {
                    var aRad = getSpokeAngle(d.spokeIdx)
                    tx = Math.cos(aRad)
                    ty = Math.sin(aRad)
                    d.x = tx * d.r
                    d.y = ty * d.r
                } else {
                    var ptP = spiralPoint(d.spokeIdx, d.k, d.u, tens)
                    d.x = ptP.x
                    d.y = ptP.y
                    d.r = ptP.r
                    var tanP = spiralTangent(d.spokeIdx, d.k, d.u, tens)
                    tx = tanP.tx
                    ty = tanP.ty
                }

                var steepness = Math.abs(ty)
                var downhillDir = (ty > 0.0) ? -1.0 : 1.0

                // Heavy or strongly shaken drops on shallow/curved regions can detach directly
                var hangLoad = mass * (1.0 - 0.30 * steepness) * (1.0 + localVib * 1.85)
                var hangThresh = 1.25 + 2.15 * friction
                if (hangLoad > hangThresh * 0.65 && (d.cooldown <= 0.0 || localVib > 0.45)) {
                    var pDrop = Math.min(2.8, (hangLoad - hangThresh * 0.65) * 0.48) * dt
                    if (Math.random() < pDrop) {
                        detachDrop(d, hub, tens)
                        continue
                    }
                }

                // Otherwise evaluate sliding depinning along the strand
                if (steepness > 0.08 && (d.cooldown <= 0.0 || localVib > 0.38)) {
                    var slideDrive = mass * steepness + localVib * mass * 1.40
                    var pinThresh = (0.26 + 1.15 * friction) * (d.mode === "radial" ? 1.12 : 1.0)
                    if (slideDrive > pinThresh * 0.42) {
                        var pDepin = Math.min(4.0, (slideDrive - pinThresh * 0.42) * 0.55) * dt
                        if (Math.random() < pDepin) {
                            d.pinned = false
                            d.speed = downhillDir * (0.018 + 0.028 * steepness)
                        }
                    }
                }
                continue
            }

            // --- SLIDING ON RADIAL SPOKE ---
            if (d.mode === "radial") {
                var alpha = getSpokeAngle(d.spokeIdx)
                var sinA = Math.sin(alpha)
                var cosA = Math.cos(alpha)
                var gAlongR = -0.34 * sinA * (0.65 + 0.55 * Math.min(2.5, mass))
                var dragR = (0.85 + 3.1 * friction) / (0.65 + 0.55 * Math.min(2.2, mass))
                d.speed += (gAlongR - dragR * d.speed) * dt
                d.speed = Math.max(-0.48, Math.min(0.48, d.speed))

                var prevR = d.r
                d.r += d.speed * dt

                // Reached outer web edge -> detach and fall
                if (d.r > 1.08) {
                    d.x = cosA * d.r
                    d.y = sinA * d.r
                    detachDrop(d, hub, tens)
                    continue
                }

                // Reached central hub from an upper spoke
                if (d.r <= 0.078) {
                    d.r = 0.078
                    d.x = cosA * d.r
                    d.y = sinA * d.r
                    if (mass * (1.0 + localVib * 1.5) > (0.95 + 1.35 * friction) && Math.random() < 0.45) {
                        detachDrop(d, hub, tens)
                        continue
                    }
                    // Route onto a steep downward lower spoke (or re-pin at hub)
                    var bestSpokes = []
                    var wSumHub = 0.0
                    for (var s = 0; s < numRadials; ++s) {
                        var sa = getSpokeAngle(s)
                        var downDot = -Math.sin(sa)
                        if (downDot > 0.35) {
                            var wS = Math.pow(downDot, 2.2)
                            bestSpokes.push({ idx: s, w: wS })
                            wSumHub += wS
                        }
                    }
                    if (wSumHub > 0.0 && Math.random() > (0.18 + 0.45 * friction) / (0.6 + mass + localVib)) {
                        var pickH = Math.random() * wSumHub
                        var accH = 0.0
                        for (var b = 0; b < bestSpokes.length; ++b) {
                            accH += bestSpokes[b].w
                            if (pickH <= accH) {
                                d.spokeIdx = bestSpokes[b].idx
                                break
                            }
                        }
                        d.r = 0.082
                        d.speed = Math.max(0.025, Math.abs(d.speed) * 0.72)
                        d.lastKnotK = 0
                        var na = getSpokeAngle(d.spokeIdx)
                        d.x = Math.cos(na) * d.r
                        d.y = Math.sin(na) * d.r
                    } else {
                        d.pinned = true
                        d.speed = 0.0
                        d.cooldown = 0.8 + 1.4 * friction
                    }
                    continue
                }

                // Check radial-spiral knot crossing
                var currK = Math.round(radiusToSpiralIndex(d.r, spacing))
                if (currK >= 1 && currK <= 30 && currK !== d.lastKnotK) {
                    var knotR = spiralIndexToRadius(currK, spacing)
                    var crossed = (prevR - knotR) * (d.r - knotR) <= 0.0
                    if (crossed) {
                        d.lastKnotK = currK
                        // Stick-slip knot stopping chance
                        var stopProbR = Math.min(0.70, (0.08 + 0.40 * friction) / (0.45 + mass * 0.95 + localVib * 1.45 + Math.abs(d.speed) * 4.2))
                        if (Math.random() < stopProbR) {
                            d.r = knotR
                            d.x = cosA * d.r
                            d.y = sinA * d.r
                            d.pinned = true
                            d.speed = 0.0
                            d.cooldown = 0.6 + 1.4 * friction
                            continue
                        }

                        // Angle-correlated branching: radial vs left/right downward spiral
                        var cRad = Math.max(0.0, (d.speed >= 0.0) ? -sinA : sinA)
                        var tLeft = spiralTangent(d.spokeIdx, currK, 0.03, tens)
                        var cLeft = Math.max(0.0, -tLeft.ty) // moving +u
                        var prevSpoke = (d.spokeIdx + numRadials - 1) % numRadials
                        var tRight = spiralTangent(prevSpoke, currK, 0.97, tens)
                        var cRight = Math.max(0.0, tRight.ty) // moving -u

                        var inertiaBias = 1.0 + 0.65 * Math.min(1.0, Math.abs(d.speed) * 5.0)
                        var wRad = (cRad > 0.05) ? Math.pow(cRad, 1.7) * inertiaBias : 0.0
                        var wLeft = (cLeft > 0.05) ? Math.pow(cLeft, 1.7) : 0.0
                        var wRight = (cRight > 0.05) ? Math.pow(cRight, 1.7) : 0.0
                        var wTotal = wRad + wLeft + wRight

                        if (wTotal > 0.0) {
                            var roll = Math.random() * wTotal
                            if (roll < wLeft) {
                                d.mode = "spiral"
                                d.k = currK
                                d.u = 0.03
                                d.speed = Math.max(0.022, Math.abs(d.speed) * 0.78)
                                var ptL = spiralPoint(d.spokeIdx, d.k, d.u, tens)
                                d.x = ptL.x; d.y = ptL.y; d.r = ptL.r
                                continue
                            } else if (roll < wLeft + wRight) {
                                d.mode = "spiral"
                                d.spokeIdx = prevSpoke
                                d.k = currK
                                d.u = 0.97
                                d.speed = -Math.max(0.022, Math.abs(d.speed) * 0.78)
                                var ptR = spiralPoint(d.spokeIdx, d.k, d.u, tens)
                                d.x = ptR.x; d.y = ptR.y; d.r = ptR.r
                                continue
                            }
                        }
                    }
                }

                // Slow-speed / micro-roughness re-pinning
                if (Math.abs(d.speed) < 0.011 || Math.random() < (0.04 + 0.16 * friction) * dt / (0.5 + mass + localVib * 2.0)) {
                    d.pinned = true
                    d.speed = 0.0
                    d.cooldown = 0.5 + 1.0 * friction
                }

                d.x = cosA * d.r
                d.y = sinA * d.r
                continue
            }

            // --- SLIDING ON CURVED CAPTURE SPIRAL ---
            if (d.mode === "spiral") {
                var tanS = spiralTangent(d.spokeIdx, d.k, d.u, tens)
                var prevTy = tanS.ty
                var prevSpdS = d.speed

                var gAlongS = -0.34 * tanS.ty * (0.65 + 0.55 * Math.min(2.5, mass))
                var dragS = (0.92 + 3.3 * friction) / (0.65 + 0.55 * Math.min(2.2, mass))
                d.speed += (gAlongS - dragS * d.speed) * dt
                d.speed = Math.max(-0.44, Math.min(0.44, d.speed))

                d.u += (d.speed / Math.max(0.015, tanS.arcLen)) * dt

                // Reached a spoke knot at either end of the spiral span
                if (d.u <= 0.0 || d.u >= 1.0) {
                    var atStart = (d.u <= 0.0)
                    var hitSpoke = atStart ? d.spokeIdx : ((d.spokeIdx + 1) % numRadials)
                    var hitAng = getSpokeAngle(hitSpoke)
                    var hitSin = Math.sin(hitAng)
                    var hitCos = Math.cos(hitAng)
                    var knotRadius = spiralIndexToRadius(d.k, spacing)

                    // Candidate 1: switch onto radial spoke (downhill)
                    var cRadOut = Math.abs(hitSin)
                    var radDir = (hitSin > 0.0) ? -1.0 : 1.0

                    // Candidate 2: continue onto adjacent spiral span across the spoke
                    var nextSpoke = atStart ? ((hitSpoke + numRadials - 1) % numRadials) : hitSpoke
                    var nextU = atStart ? 0.97 : 0.03
                    var tNext = spiralTangent(nextSpoke, d.k, nextU, tens)
                    var cNextSp = Math.max(0.0, atStart ? tNext.ty : -tNext.ty)

                    // Local V-minimum: neither branch slopes downward -> drop or re-pin!
                    if (cRadOut < 0.08 && cNextSp < 0.08) {
                        d.x = hitCos * knotRadius
                        d.y = hitSin * knotRadius
                        var dropScoreV = mass * (0.90 + localVib * 1.8) - (0.55 + 1.25 * friction)
                        if (dropScoreV > 0.0 && Math.random() < Math.min(0.95, 0.30 + dropScoreV * 0.65)) {
                            detachDrop(d, hub, tens)
                        } else {
                            d.mode = "radial"
                            d.spokeIdx = hitSpoke
                            d.r = knotRadius
                            d.pinned = true
                            d.speed = 0.0
                            d.lastKnotK = d.k
                            d.cooldown = 0.7 + 1.3 * friction
                        }
                        continue
                    }

                    // Knot stick-slip stopping chance
                    var stopProbS = Math.min(0.68, (0.08 + 0.38 * friction) / (0.45 + mass * 0.95 + localVib * 1.45 + Math.abs(d.speed) * 4.0))
                    if (Math.random() < stopProbS) {
                        d.mode = "radial"
                        d.spokeIdx = hitSpoke
                        d.r = knotRadius
                        d.x = hitCos * knotRadius
                        d.y = hitSin * knotRadius
                        d.pinned = true
                        d.speed = 0.0
                        d.lastKnotK = d.k
                        d.cooldown = 0.6 + 1.4 * friction
                        continue
                    }

                    // Angle-weighted choice: hop to radial spoke vs continue on spiral
                    var wRadOut = (cRadOut > 0.05) ? Math.pow(cRadOut, 1.7) : 0.0
                    var wNextSp = (cNextSp > 0.05) ? Math.pow(cNextSp, 1.7) * (1.0 + 0.45 * Math.min(1.0, Math.abs(d.speed) * 5.0)) : 0.0
                    if (Math.random() * (wRadOut + wNextSp) < wRadOut) {
                        d.mode = "radial"
                        d.spokeIdx = hitSpoke
                        d.r = knotRadius + radDir * 0.004
                        d.speed = radDir * Math.max(0.022, Math.abs(d.speed) * 0.80)
                        d.lastKnotK = d.k
                        d.x = hitCos * d.r
                        d.y = hitSin * d.r
                    } else {
                        d.spokeIdx = nextSpoke
                        d.u = nextU
                        d.speed = (atStart ? -1.0 : 1.0) * Math.max(0.022, Math.abs(d.speed) * 0.80)
                        var ptN = spiralPoint(d.spokeIdx, d.k, d.u, tens)
                        d.x = ptN.x; d.y = ptN.y; d.r = ptN.r
                    }
                    continue
                }

                // Check if drop pooled at the lowest point of a curved catenary sag
                var ptNow = spiralPoint(d.spokeIdx, d.k, d.u, tens)
                d.x = ptNow.x; d.y = ptNow.y; d.r = ptNow.r
                var tanNow = spiralTangent(d.spokeIdx, d.k, d.u, tens)

                var hitCurveBottom = ((prevTy * tanNow.ty <= 0.0) || (prevSpdS * d.speed < 0.0)) && (Math.abs(tanNow.ty) < 0.16)
                if (hitCurveBottom) {
                    var dropScoreC = mass * (0.88 + localVib * 1.85) - (0.52 + 1.25 * friction)
                    if (dropScoreC > 0.0 && Math.random() < Math.min(0.95, 0.28 + dropScoreC * 0.65)) {
                        detachDrop(d, hub, tens)
                    } else {
                        d.pinned = true
                        d.speed = 0.0
                        d.cooldown = 0.7 + 1.3 * friction
                    }
                    continue
                }

                if (Math.abs(d.speed) < 0.010 || Math.random() < (0.04 + 0.16 * friction) * dt / (0.5 + mass + localVib * 2.0)) {
                    d.pinned = true
                    d.speed = 0.0
                    d.cooldown = 0.5 + 1.0 * friction
                }
            }
        }

        // 3. Guaranteed transitive swept coalescence pass: touching drops ALWAYS merge!
        mergeTouchingDrops(hub, tens, invTens, true)

        // 4. Push updated droplet & wave state to shader uniforms
        syncAllDropUniforms()
        syncAllWaveUniforms()
    }

    Component.onCompleted: {
        initDroplets()
    }

    // Physical mass-spring harmonic damping & droplet physics loop
    Timer {
        interval: 16
        running: root.visible
        repeat: true
        onTriggered: {
            if (root.pluckAmplitude > 0.0005) {
                root.pluckAmplitude = root.pluckAmplitude * Math.exp(-3.2 * 0.016)
            } else if (root.pluckAmplitude !== 0.0) {
                root.pluckAmplitude = 0.0
            }

            if (root.beatImpulse > 0.0005) {
                root.beatImpulse = root.beatImpulse * Math.exp(-4.8 * 0.016)
            } else if (root.beatImpulse !== 0.0) {
                root.beatImpulse = 0.0
            }

            root.stepDroplets(0.016)
        }
    }

    // 80x32 Polar Spatial Grid Data Texture (20 spokes x 4 slots x 32 rings = 2560 addressable droplet slots)
    Canvas {
        id: dropGridCanvas
        width: 80
        height: 32
        renderStrategy: Canvas.Immediate
        property var gridBytes: null

        onPaint: {
            var ctx = getContext("2d")
            if (!ctx) return
            ctx.fillStyle = "#000000"
            ctx.fillRect(0, 0, 80, 32)
            var src = gridBytes
            if (!src) return
            for (var py = 0; py < 32; ++py) {
                var rowOff = py * 80 * 4
                for (var px = 0; px < 80; ++px) {
                    var idx = rowOff + px * 4
                    var g = src[idx + 1]
                    if (g > 0) {
                        var r = src[idx]
                        ctx.fillStyle = "rgb(" + r + "," + g + ",0)"
                        ctx.fillRect(px, py, 1, 1)
                    }
                }
            }
        }
    }

    ShaderEffectSource {
        id: dropGridSource
        sourceItem: dropGridCanvas
        hideSource: true
        live: true
        smooth: false
        mipmap: false
    }

    ShaderEffect {
        id: harpShader
        anchors.fill: parent

        // Neural audio resonance harp choreography (strictly zero when silent)
        readonly property real vocalStandingWave: (root.isVocal && root.audioActivity > 0.02) ? root.vocalEnergy * 0.40 : 0.0
        readonly property real effectiveTension: root.tension * (1.0 + 0.04 * root.beatImpulse)
        readonly property real effectivePluck: Math.max(root.pluckAmplitude, vocalStandingWave)

        // Uniforms matching GLSL std140 uniform block in harp.frag
        property vector2d u_resolution: Qt.vector2d(Math.max(1.0, root.width), Math.max(1.0, root.height))
        property vector2d u_pointer: Qt.vector2d(root.pointerPos.x, root.pointerPos.y)
        property vector2d u_pointer_vel: Qt.vector2d(root.pointerVel.x, root.pointerVel.y)
        property vector2d u_keystroke_pos: Qt.vector2d(root.keystrokePos.x, root.keystrokePos.y)
        property vector2d u_keystroke_dir: Qt.vector2d(root.keystrokeDir.x, root.keystrokeDir.y)
        property vector2d u_beat_center: Qt.vector2d(root.beatCenter.x, root.beatCenter.y)
        property vector2d u_ambient_drift: Qt.vector2d(root.ambientDrift.x, root.ambientDrift.y)
        property color u_color_silk: root.colorSilk
        property color u_color_dew: root.colorDew
        property color u_color_resonance: Qt.rgba(Math.min(1.0, root.colorResonance.r + vocalStandingWave * 0.25), Math.min(1.0, root.colorResonance.g + vocalStandingWave * 0.30), Math.min(1.0, root.colorResonance.b + vocalStandingWave * 0.35), 1.0)
        property color u_color_void: root.colorVoid
        property real u_time: root.simTime
        property real u_keystroke_energy: root.keystrokeEnergy
        property real u_shockwave_intensity: root.shockwaveIntensity
        property real u_vortex_speed: root.vortexSpeed
        property real u_bass: root.gatedBass
        property real u_mids: root.gatedMids + vocalStandingWave * 0.18
        property real u_treble: root.gatedTreble + ((root.transientHit && root.audioActivity > 0.02) ? 0.25 : 0.0)
        property real u_tension: effectiveTension
        property vector2d u_pluck_point: Qt.vector2d(root.pluckPoint.x, root.pluckPoint.y)
        property real u_pluck_amplitude: effectivePluck
        property real u_dew_density: root.dewDensity
        property real u_chromatic_dispersion: root.chromaticDispersion
        property real u_shatter_progress: root.shatterProgress
        property real u_pad1: root.beatImpulse
        property real u_pad2: root.audioActivity

        // 16 Falling Droplet slots (xy = screen-space pos, z = radius <=0 inactive, w = fallSpeed)
        property vector4d u_fall0: Qt.vector4d(0, 0, -1, 0)
        property vector4d u_fall1: Qt.vector4d(0, 0, -1, 0)
        property vector4d u_fall2: Qt.vector4d(0, 0, -1, 0)
        property vector4d u_fall3: Qt.vector4d(0, 0, -1, 0)
        property vector4d u_fall4: Qt.vector4d(0, 0, -1, 0)
        property vector4d u_fall5: Qt.vector4d(0, 0, -1, 0)
        property vector4d u_fall6: Qt.vector4d(0, 0, -1, 0)
        property vector4d u_fall7: Qt.vector4d(0, 0, -1, 0)
        property vector4d u_fall8: Qt.vector4d(0, 0, -1, 0)
        property vector4d u_fall9: Qt.vector4d(0, 0, -1, 0)
        property vector4d u_fall10: Qt.vector4d(0, 0, -1, 0)
        property vector4d u_fall11: Qt.vector4d(0, 0, -1, 0)
        property vector4d u_fall12: Qt.vector4d(0, 0, -1, 0)
        property vector4d u_fall13: Qt.vector4d(0, 0, -1, 0)
        property vector4d u_fall14: Qt.vector4d(0, 0, -1, 0)
        property vector4d u_fall15: Qt.vector4d(0, 0, -1, 0)

        // 6 Active Elastic Impulse Waves (xy = web-local origin, z = signedAmp (+up recoil / -down impact), w = age <=0 inactive)
        property vector4d u_wave0: Qt.vector4d(0, 0, 0, -1)
        property vector4d u_wave1: Qt.vector4d(0, 0, 0, -1)
        property vector4d u_wave2: Qt.vector4d(0, 0, 0, -1)
        property vector4d u_wave3: Qt.vector4d(0, 0, 0, -1)
        property vector4d u_wave4: Qt.vector4d(0, 0, 0, -1)
        property vector4d u_wave5: Qt.vector4d(0, 0, 0, -1)

        // Polar spatial grid texture for 300+ on-web physical droplets
        property var u_drop_grid: dropGridSource

        vertexShader: Qt.resolvedUrl("shaders/harp.vert.qsb")
        fragmentShader: Qt.resolvedUrl("shaders/harp.frag.qsb")
    }
}
