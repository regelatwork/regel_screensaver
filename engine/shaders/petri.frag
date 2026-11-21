#version 440

layout(location = 0) in vec2 qt_TexCoord0;
layout(location = 0) out vec4 fragColor;

layout(std140, binding = 0) uniform buf {
    mat4 qt_Matrix;
    float qt_Opacity;
    vec2 u_resolution;
    vec2 u_pointer;
    vec2 u_pointer_vel;
    vec2 u_keystroke_pos;
    vec2 u_keystroke_dir;
    vec2 u_beat_center;
    vec2 u_ambient_drift;
    vec4 u_color_bg;
    vec4 u_color_membrane;
    vec4 u_color_organelle;
    vec4 u_color_glow;
    float u_time;
    float u_keystroke_energy;
    float u_shockwave_intensity;
    float u_vortex_speed;
    float u_bass;
    float u_mids;
    float u_treble;
    float u_aperture_mode;
};

const float TAU = 6.28318530718;

// ----------------------------------------------------------------------------
// Sine-Free Periodic Polynomial Hashing & C2 Quintic Gradient Noise
// Float32-precision safe over multi-day continuous operation
// ----------------------------------------------------------------------------
vec2 hash22(vec2 p) {
    p = mod(p, 256.0);
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return -1.0 + 2.0 * fract((p3.xx + p3.yz) * p3.zy);
}

float hash21(vec2 p) {
    p = mod(p, 256.0);
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

float noise2D(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);

    float a = dot(hash22(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0));
    float b = dot(hash22(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
    float c = dot(hash22(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
    float d = dot(hash22(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));

    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm3(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    const mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
    for (int i = 0; i < 3; ++i) {
        v += a * noise2D(p);
        p = rot * p * 2.03 + vec2(1.7, 0.9);
        a *= 0.5;
    }
    return v;
}

// ----------------------------------------------------------------------------
// Continuous Lenia Kernel: Gaussian Concentric Soliton Shell
// ----------------------------------------------------------------------------
float leniaKernel(float r, float r0, float sigma) {
    float d = (r - r0) / sigma;
    return exp(-0.5 * d * d);
}

// ----------------------------------------------------------------------------
// Darkfield Suspended Colloidal Motes & Micro-Plankton Bokeh
// ----------------------------------------------------------------------------
float colloidalLayer(vec2 p, float scale, float driftPhase, float softness, float seedOffset) {
    vec2 q = p * scale + vec2(cos(driftPhase) * 0.35, sin(driftPhase * 0.7) * 0.35);
    vec2 cell = floor(q);
    vec2 f = fract(q);

    float acc = 0.0;
    for (int y = -1; y <= 1; ++y) {
        for (int x = -1; x <= 1; ++x) {
            vec2 g = vec2(float(x), float(y));
            vec2 id = cell + g;
            float rnd = hash21(id + seedOffset);
            if (rnd > 0.68) {
                vec2 jitter = 0.5 + 0.36 * hash22(id * 1.37 + seedOffset);
                float ph = mod(u_time * (0.22 + 0.30 * rnd) + rnd * TAU, TAU);
                jitter += 0.08 * vec2(cos(ph), sin(ph * 1.3));
                float d = length(g + jitter - f);
                float radius = mix(0.024, 0.080, (rnd - 0.68) / 0.32) * softness;
                float mote = exp(-d * d / (radius * radius + 0.0002));
                acc += mote * (0.35 + 0.65 * rnd);
            }
        }
    }
    return acc;
}

// ----------------------------------------------------------------------------
// Multi-Channel Translucent Lenia Organism Evaluation
// morphKind: 0.0 = Amoeba, 1.0 = Directional Orbium Glider, 2.0 = Radiolarial Colony
// Returns vec4(bodyThickness, membraneRim, organelleCore, heightField)
// ----------------------------------------------------------------------------
vec4 evaluateOrganism(
    vec2 p,
    vec2 center,
    vec2 heading,
    float baseRadius,
    float lobes,
    float phaseSpeed,
    float seed,
    float morphKind,
    float t,
    float audioBass,
    float audioMids,
    float audioTreble,
    float mitosisFactor,
    float cystFactor,
    float osmoticFactor
) {
    vec2 offset = p - center;
    float defenseContract = max(cystFactor, osmoticFactor);
    float effectiveRadius = baseRadius * mix(1.0 + audioBass * 0.20, 0.54, defenseContract);

    // Fast bounding-radius early-out
    float maxReach = effectiveRadius * (1.58 + mitosisFactor * 0.75);
    if (dot(offset, offset) > maxReach * maxReach) {
        return vec4(0.0);
    }

    float dist = length(offset);
    float angle = atan(offset.y, offset.x);
    // Smoothly damp angular modulation near center to eliminate atan(0,0) derivative singularities
    float centerDamp = smoothstep(0.0, effectiveRadius * 0.28, dist);

    // 1. Biological Cytokinesis (Mitosis Cleavage Furrow)
    if (mitosisFactor > 0.02) {
        float splitDist = mitosisFactor * baseRadius * 0.72;
        float splitAng = mod(t * 0.25 + seed * TAU, TAU);
        vec2 splitAxis = vec2(cos(splitAng), sin(splitAng));
        vec2 c1 = center + splitAxis * splitDist;
        vec2 c2 = center - splitAxis * splitDist;
        float d1 = length(p - c1);
        float d2 = length(p - c2);

        float k = baseRadius * 0.55 * (1.0 - clamp(mitosisFactor * 0.65, 0.0, 0.90));
        float h = clamp(0.5 + 0.5 * (d2 - d1) / (k + 0.0001), 0.0, 1.0);
        dist = mix(d2, d1, h) - k * h * (1.0 - h);
    }

    // 2. Organic Pseudopod & Morphology Shaping
    float ph1 = mod(t * phaseSpeed + seed * TAU, TAU);
    float ph2 = mod(-t * phaseSpeed * 0.61 + seed * 11.3, TAU);

    float lobeAmp1 = (morphKind > 1.5) ? 0.085 : ((morphKind > 0.5) ? 0.075 : 0.125);
    float lobeAmp2 = (morphKind > 1.5) ? 0.035 : ((morphKind > 0.5) ? 0.040 : 0.065);
    float lobeMod = (lobeAmp1 * sin(lobes * angle + ph1)
                   + lobeAmp2 * cos(max(2.0, lobes - 1.0) * angle + ph2))
                   * centerDamp * (1.0 - defenseContract * 0.85);

    vec2 localNorm = offset / max(effectiveRadius, 0.001);
    float driftAng = mod(t * 0.20 + seed * 5.1, TAU);
    float membraneWarp = 0.055 * noise2D(localNorm * 1.85 + vec2(cos(driftAng), sin(driftAng)) * 0.8 + seed * 7.0)
                         * centerDamp * (1.0 - defenseContract * 0.8);

    // Directional Orbium glider asymmetry (slightly elongated along heading)
    float headDot = dot(normalize(offset + vec2(0.0001)), heading) * centerDamp;
    float gliderBias = (morphKind > 0.5 && morphKind < 1.5) ? (0.09 * headDot * (1.0 - defenseContract * 0.8)) : 0.0;

    float rNorm = dist / (effectiveRadius * (1.0 + lobeMod + membraneWarp + gliderBias) + 0.0001);

    // 3. Translucent Gelatinous Body Volume (smooth dome, never flat-clamped)
    float bodyEdge = 1.0 - smoothstep(0.90, 1.06, rNorm);
    float domeProfile = sqrt(max(0.0, 1.0 - min(1.0, rNorm * rNorm * 0.94)));
    float bodyThickness = bodyEdge * (0.24 + 0.76 * domeProfile);

    // 4. Concentric Lenia Soliton Rings (crisp lipid bilayer + delicate inner Lenia wave)
    float crescentBoost = (morphKind > 0.5 && morphKind < 1.5) ? (0.72 + 0.48 * (0.5 + 0.5 * headDot)) : 1.0;
    float outerBilayer = leniaKernel(rNorm, 0.92, 0.052) * crescentBoost;
    float innerSoliton = ((morphKind > 1.5) ? 0.62 : 0.46) * leniaKernel(rNorm, 0.60, 0.078) * (1.0 - defenseContract * 0.45);
    float outerHalo    = 0.30 * leniaKernel(rNorm, 1.01, 0.125);

    // 5. Ultra-Fine Translucent Cilia Fringe (subtle in silence, lively shimmer on treble)
    float ciliaPhase = mod(t * (2.2 + audioTreble * 11.0) + seed * TAU, TAU);
    float ciliaWave = 0.5 + 0.5 * sin(angle * (lobes * 7.0 + 26.0) + ciliaPhase);
    float ciliaMask = smoothstep(0.93, 1.01, rNorm) * (1.0 - smoothstep(1.03, 1.15, rNorm));
    float cilia = ciliaMask * (0.065 + audioTreble * 0.42) * pow(ciliaWave, 1.2) * (1.0 - defenseContract);

    float membraneRim = outerBilayer * 0.98 + innerSoliton + outerHalo + cilia;

    // 6. Glowing Interior Organelles: Nucleus, Nucleolus & Morph-Specific Vacuoles
    float nucPhase = mod(t * 0.30 + seed * 9.2, TAU);
    vec2 nucPos = vec2(cos(nucPhase), sin(nucPhase * 1.2)) * 0.12;
    if (morphKind > 0.5 && morphKind < 1.5) {
        // Orbium glider nucleus sits slightly forward toward the leading crescent
        nucPos += heading * 0.10;
    }
    float nucDist = length(localNorm - nucPos);
    float nucleusRing = 0.55 * leniaKernel(nucDist, 0.21, 0.070);
    float nucleolus   = 0.88 * leniaKernel(nucDist, 0.0, 0.115);

    // Orbiting translucent vacuoles / chloroplasts inside the cytoplasm
    float vacuoles = 0.0;
    int vacCount = (morphKind > 1.5) ? 4 : 3;
    for (int i = 0; i < 4; ++i) {
        if (i >= vacCount) break;
        float fi = float(i);
        float vAng = mod(t * (0.16 + 0.06 * fi) * (mod(fi, 2.0) < 0.5 ? 1.0 : -1.0) + seed * 13.7 + fi * (TAU / float(vacCount)), TAU);
        float vRad = (morphKind > 1.5) ? 0.39 : (0.33 + 0.13 * sin(vAng * 0.7 + fi));
        vec2 vPos = vec2(cos(vAng), sin(vAng)) * vRad;
        float vd = length(localNorm - vPos);
        float vSize = (morphKind > 1.5) ? 0.065 : (0.080 + 0.022 * fi);
        vacuoles += 0.42 * leniaKernel(vd, vSize, 0.036) + 0.28 * leniaKernel(vd, 0.0, vSize * 0.72);
    }

    // Subtle cytoplasmic streaming texture (responds to mids & treble)
    vec2 streamUV = localNorm * 4.8 + vec2(cos(driftAng) * 0.55, sin(driftAng) * 0.55) + seed * 17.0;
    float cytoGranules = smoothstep(0.15, 0.68, fbm3(streamUV)) * 0.28 * (0.50 + audioMids * 1.1 + audioTreble * 0.85);

    float organelleCore = bodyEdge * (nucleusRing + nucleolus + vacuoles * 0.72 + cytoGranules * (0.35 + 0.65 * domeProfile));

    // 7. Smooth 3D Gelatinous Elevation Field for Phase-Contrast Normals (dFdx/dFdy)
    float smoothRimDome = leniaKernel(rNorm, 0.88, 0.11);
    float heightField = bodyEdge * (0.60 * domeProfile + 0.14 * smoothRimDome + 0.10 * innerSoliton + 0.22 * nucleolus);

    return vec4(bodyThickness, membraneRim, organelleCore, heightField);
}

// Soft translucent overlap blending (prevents harsh additive clipping when two cells pass each other)
void accumulateOrganism(inout vec4 total, vec4 org, float weight) {
    org *= weight;
    total.x = 1.0 - (1.0 - total.x) * (1.0 - clamp(org.x, 0.0, 0.92));
    total.y = total.y + org.y * (1.0 - 0.45 * clamp(total.y, 0.0, 1.0));
    total.z = total.z + org.z * (1.0 - 0.35 * clamp(total.z, 0.0, 1.0));
    total.w = max(total.w, org.w) + 0.15 * min(total.w, org.w);
}

void main() {
    vec2 uv = qt_TexCoord0;
    float aspect = u_resolution.x / max(u_resolution.y, 1.0);
    vec2 p = uv;
    p.x *= aspect;

    vec2 centerP = vec2(0.5 * aspect, 0.5);

    // --- Microscope Slide Aperture Optics ---
    vec2 slideOffset = p - centerP;
    float slideDist = length(slideOffset);

    float dishRadius = mix(2.5, 0.465, u_aperture_mode);
    float glassRim = smoothstep(dishRadius - 0.024, dishRadius - 0.004, slideDist)
                   * (1.0 - smoothstep(dishRadius + 0.006, dishRadius + 0.028, slideDist))
                   * u_aperture_mode;
    float insideDish = mix(1.0, 1.0 - smoothstep(dishRadius - 0.005, dishRadius + 0.012, slideDist), u_aperture_mode);

    float glassBevel = pow(clamp(1.0 - abs(slideDist - (dishRadius - 0.005)) * 95.0, 0.0, 1.0), 2.6) * u_aperture_mode;

    float tickAngle = atan(slideOffset.y, slideOffset.x);
    float majorTicks = smoothstep(0.975, 1.0, cos(tickAngle * 24.0))
                     * smoothstep(dishRadius - 0.014, dishRadius - 0.004, slideDist)
                     * (1.0 - smoothstep(dishRadius + 0.014, dishRadius + 0.024, slideDist));
    float minorTicks = smoothstep(0.988, 1.0, cos(tickAngle * 96.0))
                     * smoothstep(dishRadius - 0.010, dishRadius - 0.002, slideDist)
                     * (1.0 - smoothstep(dishRadius + 0.008, dishRadius + 0.016, slideDist));
    float stageTicks = (majorTicks * 0.65 + minorTicks * 0.30) * u_aperture_mode;

    // --- Chemotaxis, Behavioral AI & Environmental Vectors ---
    vec2 pointerP = u_pointer;
    pointerP.x *= aspect;

    vec2 keystrokeP = u_keystroke_pos;
    keystrokeP.x *= aspect;

    // Monotonic wrapped biological time (never multiplied by oscillating vortex speed!)
    float t = u_time;

    float cystFactor = smoothstep(0.10, 0.90, u_shockwave_intensity);
    float mitosisFactor = smoothstep(0.30, 1.80, u_keystroke_energy);
    float osmoticFactor = clamp(-u_vortex_speed * 0.6, 0.0, 1.0);

    float mouseSpeed = length(u_pointer_vel);
    vec2 fluidStir = u_pointer_vel * 0.32;
    vec2 currentP = p - (u_ambient_drift * 0.4 + fluidStir);

    // Pointer activity: zero when cursor rests at default center (prevents clumping!)
    float pointerOffset = length(u_pointer - vec2(0.5, 0.5));
    float pointerActive = clamp(smoothstep(0.015, 0.08, pointerOffset) + smoothstep(0.002, 0.025, mouseSpeed), 0.0, 1.0);

    float predatorPanic = smoothstep(0.14, 0.55, mouseSpeed);
    float feedAttract = smoothstep(0.08, 0.65, u_keystroke_energy);

    // Spread scale: wide panoramic ecosystem in borderless mode, neatly framed inside circular slide in aperture mode
    float spreadX = mix(aspect * 0.39, 0.27, u_aperture_mode);
    float spreadY = mix(0.35, 0.26, u_aperture_mode);
    float sizeScale = mix(1.0, 0.78, u_aperture_mode);

    // ------------------------------------------------------------------------
    // Well-Distributed Ecosystem of 7 Living Lenia Organisms
    // Slow, serene organic Lissajous & orbital drift across distinct territories
    // ------------------------------------------------------------------------
    float a1 = mod(t * 0.14, TAU);
    float a2 = mod(t * 0.19 + 0.8, TAU);
    float a3 = mod(-t * 0.17 + 2.6, TAU);
    float a4 = mod(t * 0.13 + 4.1, TAU);
    float a5 = mod(-t * 0.21 + 1.2, TAU);
    float a6 = mod(t * 0.25 + 5.0, TAU);
    float a7 = mod(-t * 0.23 + 3.1, TAU);

    // 1. Sovereign Central Amoeba (gentle center territory)
    vec2 c1 = centerP + vec2(
        -0.06 * spreadX + 0.18 * spreadX * cos(a1) + fluidStir.x * 0.5,
        -0.02 * spreadY + 0.18 * spreadY * sin(a1 * 1.2 + 0.4) + fluidStir.y * 0.5
    );
    vec2 h1 = normalize(vec2(-sin(a1), cos(a1 * 1.2 + 0.4)) + vec2(0.001));

    // 2. Orbium Soliton Glider A (upper-left to upper-center sweep)
    vec2 c2 = centerP + vec2(
        -0.58 * spreadX + 0.26 * spreadX * cos(a2),
         0.48 * spreadY + 0.22 * spreadY * sin(a2 * 1.3)
    );
    vec2 h2 = normalize(vec2(-sin(a2) * spreadX, 1.3 * cos(a2 * 1.3) * spreadY) + vec2(0.001));

    // 3. Orbium Soliton Glider B (lower-right graceful arc)
    vec2 c3 = centerP + vec2(
         0.56 * spreadX + 0.24 * spreadX * sin(a3),
        -0.46 * spreadY + 0.22 * spreadY * cos(a3 * 1.2)
    );
    vec2 h3 = normalize(vec2(-cos(a3) * spreadX, 1.2 * sin(a3 * 1.2) * spreadY) + vec2(0.001));

    // 4. Radiolarial Multi-Lobed Colony (upper-right quadrant)
    vec2 c4 = centerP + vec2(
         0.62 * spreadX + 0.18 * spreadX * cos(a4),
         0.42 * spreadY + 0.20 * spreadY * sin(a4 * 1.3)
    );
    vec2 h4 = normalize(vec2(-sin(a4), cos(a4 * 1.3)) + vec2(0.001));

    // 5. Twin-Ring Colony Cell (lower-left quadrant)
    vec2 c5 = centerP + vec2(
        -0.64 * spreadX + 0.20 * spreadX * sin(a5),
        -0.44 * spreadY + 0.20 * spreadY * cos(a5 * 1.2)
    );
    vec2 h5 = normalize(vec2(-cos(a5), sin(a5 * 1.2)) + vec2(0.001));

    // 6. Micro-Flagellate Wanderer A (far mid-left drift)
    vec2 c6 = centerP + vec2(
        -0.82 * spreadX + 0.18 * spreadX * cos(a6),
         0.04 * spreadY + 0.30 * spreadY * sin(a6 * 1.4)
    );
    vec2 h6 = normalize(vec2(-sin(a6), cos(a6 * 1.4)) + vec2(0.001));

    // 7. Micro-Flagellate Wanderer B (mid-right / lower-center drift)
    vec2 c7 = centerP + vec2(
         0.24 * spreadX + 0.28 * spreadX * sin(a7),
        -0.68 * spreadY + 0.16 * spreadY * cos(a7 * 1.5)
    );
    vec2 h7 = normalize(vec2(-cos(a7), sin(a7 * 1.5)) + vec2(0.001));

    // Gentle chemotaxis with personal-space halo (only when pointer is active)
    if (pointerActive > 0.01) {
        vec2 toP1 = pointerP - c1;
        float dP1 = length(toP1) + 0.001;
        float pull1 = smoothstep(0.16, 0.45, dP1) * 0.16 * pointerActive;
        c1 += mix(toP1 * pull1, -(toP1 / dP1) * 0.16, predatorPanic);

        vec2 toP2 = pointerP - c2;
        float dP2 = length(toP2) + 0.001;
        float pull2 = smoothstep(0.14, 0.42, dP2) * 0.12 * pointerActive;
        c2 += mix(toP2 * pull2, -(toP2 / dP2) * 0.18, predatorPanic);

        vec2 toP3 = pointerP - c3;
        float dP3 = length(toP3) + 0.001;
        c3 += mix(vec2(0.0), -(toP3 / dP3) * 0.20, predatorPanic);
    }

    // Keystroke nutrient attraction
    if (feedAttract > 0.01) {
        c1 = mix(c1, keystrokeP, feedAttract * 0.30);
        c2 = mix(c2, keystrokeP, feedAttract * 0.22);
        c3 = mix(c3, keystrokeP, feedAttract * 0.18);
        c5 = mix(c5, keystrokeP, feedAttract * 0.20);
    }

    // Single-pass evaluation of all 7 organisms (Amoebae, Orbium Gliders, Radiolarial Colonies)
    vec4 field = vec4(0.0);
    accumulateOrganism(field, evaluateOrganism(currentP, c1, h1, 0.160 * sizeScale, 5.0,  0.38, 0.13, 0.0, t, u_bass,        u_mids, u_treble,        mitosisFactor,        cystFactor, osmoticFactor), 1.00);
    accumulateOrganism(field, evaluateOrganism(currentP, c2, h2, 0.112 * sizeScale, 3.0,  0.55, 0.37, 1.0, t, u_bass * 0.85, u_mids, u_treble * 1.05, mitosisFactor * 0.65, cystFactor, osmoticFactor), 0.96);
    accumulateOrganism(field, evaluateOrganism(currentP, c3, h3, 0.098 * sizeScale, 3.0, -0.52, 0.61, 1.0, t, u_bass * 0.78, u_mids, u_treble * 0.98, 0.0,                  cystFactor, osmoticFactor), 0.92);
    accumulateOrganism(field, evaluateOrganism(currentP, c4, h4, 0.104 * sizeScale, 6.0,  0.30, 0.83, 2.0, t, u_bass * 0.80, u_mids, u_treble * 1.10, 0.0,                  cystFactor, osmoticFactor), 0.94);
    accumulateOrganism(field, evaluateOrganism(currentP, c5, h5, 0.084 * sizeScale, 5.0, -0.42, 0.29, 2.0, t, u_bass * 0.68, u_mids, u_treble * 1.00, 0.0,                  cystFactor, osmoticFactor), 0.88);
    accumulateOrganism(field, evaluateOrganism(currentP, c6, h6, 0.058 * sizeScale, 4.0,  0.64, 0.53, 0.0, t, u_bass * 0.55, u_mids, u_treble * 1.15, 0.0,                  cystFactor, osmoticFactor), 0.84);
    accumulateOrganism(field, evaluateOrganism(currentP, c7, h7, 0.052 * sizeScale, 3.0, -0.60, 0.77, 1.0, t, u_bass * 0.55, u_mids, u_treble * 1.15, 0.0,                  cystFactor, osmoticFactor), 0.82);

    float bodyThickness = field.x;
    float membraneRim   = field.y;
    float organelleCore = field.z;
    float heightField   = field.w;

    // ------------------------------------------------------------------------
    // Hardware Screen-Space Phase-Contrast Normals (soft-clamped for silky speculars)
    // ------------------------------------------------------------------------
    vec2 grad = vec2(dFdx(heightField), dFdy(heightField)) * u_resolution.y * 0.34;
    grad /= (1.0 + length(grad) * 0.55);
    vec3 normal = normalize(vec3(-grad.x, -grad.y, 0.30));

    vec3 lightDir1 = normalize(vec3(0.45, 0.55, 0.72));
    vec3 lightDir2 = normalize(vec3(-0.55, -0.35, 0.68));
    vec3 viewDir   = vec3(0.0, 0.0, 1.0);

    float ndv = clamp(dot(normal, viewDir), 0.0, 1.0);
    float fresnel = pow(1.0 - ndv, 2.4);

    vec3 half1 = normalize(lightDir1 + viewDir);
    vec3 half2 = normalize(lightDir2 + viewDir);
    float spec1 = pow(clamp(dot(normal, half1), 0.0, 1.0), 18.0);
    float spec2 = pow(clamp(dot(normal, half2), 0.0, 1.0), 14.0) * 0.40;
    float specular = (spec1 + spec2) * smoothstep(0.05, 0.28, bodyThickness);

    // ------------------------------------------------------------------------
    // Darkfield Optical Medium & Colloidal Depth-of-Field Motes
    // ------------------------------------------------------------------------
    vec3 colBg        = u_color_bg.rgb;
    vec3 colMembrane  = u_color_membrane.rgb;
    vec3 colOrganelle = u_color_organelle.rgb;
    vec3 colGlow      = u_color_glow.rgb;

    float bgVignette = clamp(1.06 - 0.34 * slideDist, 0.55, 1.06);
    float fluidSheen = 0.5 + 0.5 * fbm3(p * 2.2 + vec2(cos(mod(t * 0.06, TAU)), sin(mod(t * 0.05, TAU))) * 0.5);
    vec3 finalColor = colBg * bgVignette + mix(colBg, colGlow, 0.18) * fluidSheen * 0.065;

    // Two parallax depths of drifting suspended colloidal micro-plankton
    float motesNear = colloidalLayer(p, 11.0, mod(t * 0.07, TAU), 0.55, 1.7);
    float motesFar  = colloidalLayer(p,  6.5, mod(-t * 0.04, TAU), 1.45, 9.3);
    finalColor += mix(colMembrane, colGlow, 0.55) * motesNear * 0.14;
    finalColor += colOrganelle * motesFar * 0.06;

    // Audio-gated fluid pressure ripples & subtle Chladni nodal shimmer (silent = 0.0!)
    float audioTotal = u_bass + u_mids + u_treble;
    if (audioTotal > 0.005) {
        float wavePhase = mod(t * 5.0, TAU);
        float acousticWave = sin(slideDist * 26.0 - wavePhase) * exp(-slideDist * 2.6) * u_bass * 0.24;
        finalColor += colGlow * max(0.0, acousticWave);

        float chladni = sin(slideDist * 20.0 - wavePhase * 0.5) * cos(tickAngle * 6.0 + mod(t * 0.4, TAU));
        float chladniGlow = smoothstep(0.45, 0.95, abs(chladni)) * exp(-slideDist * 1.4) * (u_mids * 0.14 + u_treble * 0.10);
        finalColor += mix(colOrganelle, colGlow, 0.5) * chladniGlow;
    }

    // ------------------------------------------------------------------------
    // Translucent Darkfield Organism Compositing
    // ------------------------------------------------------------------------
    vec3 deepCytoplasm = mix(colBg * 1.65, colMembrane * 0.20 + colGlow * 0.14, 0.65);
    float bodyAlpha = smoothstep(0.02, 0.85, bodyThickness) * 0.66;
    finalColor = mix(finalColor, deepCytoplasm, bodyAlpha);

    // Soft external bioluminescent subsurface halo
    float halo = smoothstep(0.01, 0.55, membraneRim * 0.6 + bodyThickness * 0.5) * (0.20 + u_bass * 0.34);
    finalColor += colGlow * halo * 0.22;

    // Luminous concentric Lenia lipid bilayer membranes (darkfield edge scatter)
    vec3 membraneLight = colMembrane * (0.76 * membraneRim) + mix(colMembrane, colGlow, 0.55) * (fresnel * bodyThickness * 0.68);

    // Glowing interior organelles, nucleus, and vacuoles
    vec3 organelleLight = colOrganelle * (0.84 * organelleCore * (0.85 + u_mids * 0.65 + u_treble * 0.45));

    // Silky wet gelatinous specular highlights
    vec3 specLight = mix(vec3(1.0), colMembrane, 0.35) * (specular * 0.52);

    vec3 bioEmission = membraneLight + organelleLight + specLight;

    // Acidic toxicity shift (crimson / amber necrosis during auth failure shockwave)
    if (u_shockwave_intensity > 0.01) {
        float shockDist = length(p - centerP);
        float shockRing = exp(-pow(shockDist - (u_shockwave_intensity * 0.65), 2.0) * 35.0) * u_shockwave_intensity;
        bioEmission = mix(bioEmission, vec3(0.95, 0.20, 0.08) * (membraneRim + organelleCore * 0.8), cystFactor * 0.85);
        finalColor += vec3(1.0, 0.15, 0.05) * shockRing * 1.8;
    }

    finalColor += bioEmission;

    // Backspace Osmotic Reverse-Pressure Wave
    if (osmoticFactor > 0.01) {
        float osmoticDist = length(p - keystrokeP);
        float osmoticWave = sin(osmoticDist * 34.0 + mod(t * 10.0, TAU)) * exp(-osmoticDist * 7.5) * osmoticFactor;
        finalColor += colMembrane * max(0.0, osmoticWave) * 1.2;
    }

    // Keystroke Nutrient Droplet Injection (only visible when typing or downbeat pulse)
    if (u_keystroke_energy > 0.01) {
        float nutrientDist = length(p - keystrokeP);
        float nutrientSpark = exp(-nutrientDist * 24.0) * (0.8 + 0.35 * sin(mod(t * 6.0, TAU))) * u_keystroke_energy;
        float nutrientRings = sin(nutrientDist * 42.0 - mod(t * 5.0, TAU)) * exp(-nutrientDist * 9.0) * u_keystroke_energy;
        float nutrientGlow = clamp(nutrientSpark + max(0.0, nutrientRings), 0.0, 1.2);
        finalColor += nutrientGlow * colOrganelle * 1.15;
    }

    // Cursor Pheromone Trail (only visible when pointer is active)
    if (pointerActive > 0.02) {
        float cursorDist = length(p - pointerP);
        float cursorPheromone = exp(-cursorDist * 18.0) * (0.22 + 0.25 * u_mids) * pointerActive;
        finalColor += cursorPheromone * colGlow * 0.85;
    }

    // Gentle HDR shoulder compression (preserves vibrant translucency without flat cyan clipping)
    finalColor = finalColor / (1.0 + finalColor * 0.26);

    // ------------------------------------------------------------------------
    // Microscope Apparatus Presentation (Circular Slide Glass vs Borderless)
    // ------------------------------------------------------------------------
    if (u_aperture_mode > 0.01) {
        vec3 stageColor = vec3(0.015, 0.022, 0.036);
        float stageNoise = noise2D(p * 32.0) * 0.008;
        stageColor += stageNoise;

        vec3 glassEdgeColor = mix(vec3(0.10, 0.18, 0.28), colGlow * 0.35, 0.3) * glassRim;
        finalColor = mix(stageColor, finalColor, insideDish);
        finalColor = mix(finalColor, glassEdgeColor, glassRim * 0.55);
        finalColor += vec3(glassBevel * 0.68) + mix(colMembrane, colGlow, 0.5) * stageTicks * 0.72;
    }

    fragColor = vec4(finalColor, 1.0) * qt_Opacity;
}
