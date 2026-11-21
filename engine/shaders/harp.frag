#version 440

layout(location = 0) in vec2 qt_TexCoord0;
layout(location = 0) out vec4 fragColor;

layout(std140, binding = 0) uniform buf {
    mat4 qt_Matrix;              // 0..63
    float qt_Opacity;            // 64..67
    vec2 u_resolution;           // 72..79
    vec2 u_pointer;              // 80..87
    vec2 u_pointer_vel;          // 88..95
    vec2 u_keystroke_pos;        // 96..103
    vec2 u_keystroke_dir;        // 104..111
    vec2 u_beat_center;          // 112..119
    vec2 u_ambient_drift;        // 120..127
    vec4 u_color_silk;           // 128..143 (Luminescent silk thread tint)
    vec4 u_color_dew;            // 144..159 (Prismatic dew drop caustics)
    vec4 u_color_resonance;      // 160..175 (Acoustic wave harmonic glow)
    vec4 u_color_void;           // 176..191 (Background architectural void / moonlight)
    float u_time;                // 192..195
    float u_keystroke_energy;    // 196..199 (Pluck vibration intensity)
    float u_shockwave_intensity; // 200..203 (Resonant shatter & web snap)
    float u_vortex_speed;        // 204..207 (Dampener mute / golden dissolution)
    float u_bass;                // 208..211 (Noise-gated standing wave antinodes)
    float u_mids;                // 212..215 (Noise-gated harmonic overtone ringing)
    float u_treble;              // 216..219 (Noise-gated dewdrop sparkle & caustics)
    float u_tension;             // 220..223 (Structural lattice tension)
    vec2 u_pluck_point;          // 224..231 (Interactive mouse pluck & displacement)
    float u_pluck_amplitude;     // 232..235 (Damped string displacement)
    float u_dew_density;         // 236..239 (Dew droplet condensation coverage)
    float u_chromatic_dispersion;// 240..243 (Prismatic rainbow index)
    float u_shatter_progress;    // 244..247 (Shatter / repair progress)
    float u_pad1;                // 248..251 (Damped beat impulse)
    float u_pad2;                // 252..255 (Gated audio activity 0..1)
};

const float PI = 3.14159265;
const float TAU = 6.28318530;
const float NUM_RADIALS = 20.0;

// --- Sine-Free Polynomial Hashes (float32 long-run safe) ---
float hash11(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return -1.0 + 2.0 * fract((p3.xx + p3.yz) * p3.zy);
}

float noise2D(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    vec2 i00 = mod(i, 256.0);
    vec2 i10 = mod(i + vec2(1.0, 0.0), 256.0);
    vec2 i01 = mod(i + vec2(0.0, 1.0), 256.0);
    vec2 i11 = mod(i + vec2(1.0, 1.0), 256.0);
    float a = dot(hash22(i00), f - vec2(0.0, 0.0));
    float b = dot(hash22(i10), f - vec2(1.0, 0.0));
    float c = dot(hash22(i01), f - vec2(0.0, 1.0));
    float d = dot(hash22(i11), f - vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Wrap a phase for long-running float32 precision
float wrapPhase(float x) {
    return mod(x, TAU);
}

// --- Organic Radial Spoke Angle (with subtle deterministic jitter) ---
float getSpokeAngle(float idx) {
    float wrappedIdx = mod(idx + NUM_RADIALS, NUM_RADIALS);
    float stepA = TAU / NUM_RADIALS;
    float jitter = (hash11(wrappedIdx * 7.13 + 1.7) - 0.5) * stepA * 0.24;
    return (wrappedIdx + 0.5) * stepA - PI + jitter;
}

// Shortest signed angular difference in [-PI, PI]
float angleDiff(float a, float b) {
    return mod(a - b + PI, TAU) - PI;
}

// --- Progressive Orb-Weaver Spiral Radius Mapping ---
// Tighter near the hub, gently expanding outward like a real orb web
float spiralIndexToRadius(float k, float spacing) {
    float kPos = max(0.0, k);
    float baseR = 0.078 + spacing * (kPos * 0.78 + 0.018 * kPos * kPos);
    float jitter = (hash11(kPos * 13.7 + 4.3) - 0.5) * spacing * 0.14;
    return baseR + jitter;
}

float radiusToSpiralIndex(float r, float spacing) {
    // Invert baseR = 0.078 + spacing * (0.78 * k + 0.018 * k^2)
    float u = max(0.0, (r - 0.078) / max(spacing, 0.001));
    float disc = 0.78 * 0.78 + 4.0 * 0.018 * u;
    return (-0.78 + sqrt(disc)) / (2.0 * 0.018);
}

// --- Simulated Multi-Octave Ambient Wind Field ---
// Produces a gentle, organic, non-periodic breeze that bows the center of the web
// while keeping the outer boundary anchors tethered.
vec2 evalWindOffset(vec2 pos, float t, float tension) {
    // Slowly varying gust strength (incommensurate frequencies -> non-periodic feel)
    float g1 = sin(wrapPhase(t * 0.17 + 0.4));
    float g2 = sin(wrapPhase(t * 0.29 + 1.9));
    float g3 = sin(wrapPhase(t * 0.11 + 3.7));
    float gustEnv = 0.30 + 0.70 * clamp(0.5 + 0.28 * g1 + 0.16 * g2 + 0.14 * g3, 0.0, 1.0);

    // Slowly drifting wind direction
    float windAngle = 0.35 + 0.55 * sin(wrapPhase(t * 0.073)) + 0.30 * cos(wrapPhase(t * 0.131));
    vec2 windDir = vec2(cos(windAngle), sin(windAngle));
    vec2 windPerp = vec2(-windDir.y, windDir.x);

    // Spatial traveling breeze wave across the web
    float travel = dot(pos, windDir) * 1.9 - mod(t * 0.52, 256.0);
    float breeze = noise2D(vec2(travel, dot(pos, windPerp) * 1.2 + mod(t * 0.14, 256.0)));
    float crossFlutter = noise2D(pos * 2.4 + vec2(mod(t * 0.21, 256.0), -mod(t * 0.16, 256.0)));

    // Anchored at outer frame, free to billow softly in center/mid web
    float rDist = length(pos);
    float tetherMask = exp(-rDist * rDist * 1.15);
    float invTension = 1.0 / max(0.55, 0.55 + tension * 0.45);

    vec2 sway = (windDir * (0.016 + 0.022 * breeze) + windPerp * (0.012 * crossFlutter)) * gustEnv;
    return sway * tetherMask * invTension;
}

// --- Moonlit Canopy / Architectural Void Backdrop ---
// Also sampled by dewdrops for realistic inverted dielectric refraction!
vec3 evalBackdrop(vec2 pos, float t, float aspect) {
    float rLen = length(pos);
    float vig = clamp(1.12 - rLen * 0.62, 0.15, 1.0);
    vec3 col = u_color_void.rgb * vig;

    // Soft upper-left moonlight atmospheric wash
    vec2 moonPos = vec2(-0.52 * aspect, 0.44);
    float moonDist = length(pos - moonPos);
    float moonHalo = exp(-moonDist * 1.55);
    col += mix(u_color_silk.rgb, u_color_resonance.rgb, 0.45) * moonHalo * 0.11;

    // Subtle shifting moonlit mist shafts
    float shaftCoord = pos.x * 2.8 - pos.y * 2.1;
    float shaft = 0.5 + 0.5 * sin(shaftCoord + sin(wrapPhase(t * 0.13)) * 0.8);
    float shaftNoise = 0.5 + 0.5 * noise2D(pos * 1.8 + vec2(mod(t * 0.05, 256.0), 0.0));
    col += u_color_silk.rgb * pow(shaft, 3.0) * shaftNoise * moonHalo * 0.065;

    // Out-of-focus distant moonlit canopy bokeh orbs (gives depth & rich dewdrop refraction)
    vec3 bokeh = vec3(0.0);
    for (int i = 0; i < 6; ++i) {
        float fi = float(i);
        vec2 seed = vec2(hash11(fi * 17.3 + 2.1), hash11(fi * 31.7 + 9.4));
        vec2 bCenter = (seed - 0.5) * vec2(aspect * 1.5, 1.05);
        bCenter += vec2(
            sin(wrapPhase(t * (0.08 + 0.02 * fi) + fi * 1.7)),
            cos(wrapPhase(t * (0.06 + 0.015 * fi) + fi * 2.3))
        ) * 0.04;
        float bRad = mix(0.06, 0.17, hash11(fi * 43.1 + 5.2));
        float d = length(pos - bCenter);
        float disc = smoothstep(bRad, bRad * 0.25, d);
        float rim = smoothstep(bRad, bRad * 0.72, d) * smoothstep(bRad * 0.45, bRad * 0.85, d);
        vec3 bTint = mix(u_color_dew.rgb, u_color_silk.rgb, hash11(fi * 11.9));
        bokeh += bTint * (disc * 0.022 + rim * 0.015);
    }
    col += bokeh;

    return col;
}

// --- Evaluate Optical Prism Dewdrop ---
// Returns vec4(rgb, alpha) so droplets sit with real 3D volume over the silk
vec4 evalDewdrop(vec2 p, vec2 dropCenter, float dropRadius, vec2 mouseVec, float t, float aspect, float px) {
    float dDrop = length(p - dropCenter);
    if (dDrop > dropRadius * 2.4) {
        return vec4(0.0);
    }

    vec3 outCol = vec3(0.0);
    float outAlpha = 0.0;

    // Soft micro-caustic halo outside the droplet (subtle in silence, sparkles on treble)
    float halo = exp(-dDrop / max(dropRadius * 1.15, 0.002)) * (0.09 + u_treble * 0.35);
    outCol += u_color_dew.rgb * halo;

    if (dDrop < dropRadius + px * 1.5) {
        float aa = max(px * 1.25, 0.0007);
        float dropMask = smoothstep(dropRadius + aa, dropRadius - aa, dDrop);

        vec2 n2 = (p - dropCenter) / max(dropRadius, 0.0005);
        float r2 = clamp(dot(n2, n2), 0.0, 0.999);
        float nz = sqrt(1.0 - r2);
        vec3 N = vec3(n2, nz);

        // Inverted spherical refraction of the moonlit backdrop with RGB chromatic dispersion
        float disp = 0.022 * u_chromatic_dispersion;
        vec2 refrBase = dropCenter - n2 * dropRadius * 5.5;
        vec3 refracted;
        refracted.r = evalBackdrop(refrBase + n2 * disp * 1.0, t, aspect).r;
        refracted.g = evalBackdrop(refrBase, t, aspect).g;
        refracted.b = evalBackdrop(refrBase - n2 * disp * 1.3, t, aspect).b;
        // Darkened glass interior + slight tint
        vec3 interior = refracted * 1.35 + u_color_void.rgb * 0.25;

        // Primary moonlight direction (upper-left)
        vec3 lightMoon = normalize(vec3(-0.55, 0.65, 0.52));
        // Secondary subtle pointer light
        vec3 lightPtr = normalize(vec3(mouseVec - dropCenter, 0.35));

        // Focused internal caustic crescent on the opposite (bottom-right) side of the drop!
        vec2 causticDir = normalize(vec2(0.55, -0.65));
        float causticAlign = max(0.0, dot(n2, causticDir));
        float causticBand = pow(causticAlign, 2.2) * smoothstep(0.14, 0.86, sqrt(r2)) * smoothstep(1.0, 0.80, sqrt(r2));

        // Chromatic prism spectrum along the caustic crescent
        vec3 prism;
        prism.r = 0.5 + 0.5 * sin(n2.x * 5.8 + n2.y * 2.6 + 0.0);
        prism.g = 0.5 + 0.5 * sin(n2.x * 5.8 + n2.y * 2.6 + 2.094);
        prism.b = 0.5 + 0.5 * sin(n2.x * 5.8 + n2.y * 2.6 + 4.188);
        vec3 causticTint = mix(u_color_dew.rgb, prism * 0.95 + u_color_dew.rgb * 0.45, u_chromatic_dispersion * 0.78);
        vec3 internalCaustic = causticTint * causticBand * (1.25 + u_treble * 1.1);

        // Dielectric Fresnel Rim (water n=1.333 -> R0 ~= 0.02)
        float fresnel = 0.02 + 0.98 * pow(1.0 - nz, 4.0);
        vec3 rimColor = mix(u_color_silk.rgb, u_color_dew.rgb, 0.48) * fresnel * 0.95;

        // Crisp pinpoint specular highlights (Blinn-Phong)
        vec3 V = vec3(0.0, 0.0, 1.0);
        vec3 H1 = normalize(lightMoon + V);
        vec3 H2 = normalize(lightPtr + V);
        float specMoon = pow(max(0.0, dot(N, H1)), 88.0) * 1.55;
        float specPtr = pow(max(0.0, dot(N, H2)), 60.0) * (0.32 + u_treble * 0.85);

        vec3 dropSurface = interior + internalCaustic + rimColor + vec3(1.0, 0.99, 0.97) * (specMoon + specPtr);
        outCol = mix(outCol, dropSurface, dropMask);
        outAlpha = dropMask * 0.92;
    }

    // Subtle 4-point diffraction star glint on larger drops catching moonlight / treble
    if (dropRadius > 0.0072) {
        vec2 glintOff = (p - dropCenter) - vec2(-0.34, 0.40) * dropRadius;
        float gx = exp(-abs(glintOff.x) * 420.0) * exp(-abs(glintOff.y) * 95.0);
        float gy = exp(-abs(glintOff.y) * 420.0) * exp(-abs(glintOff.x) * 95.0);
        float star = (gx + gy) * smoothstep(0.0072, 0.011, dropRadius) * (0.28 + u_treble * 0.65);
        outCol += mix(vec3(1.0), u_color_dew.rgb, 0.25) * star;
    }

    return vec4(outCol, outAlpha);
}

void main() {
    vec2 uv = qt_TexCoord0;
    float aspect = u_resolution.x / max(u_resolution.y, 1.0);
    float px = 1.0 / max(u_resolution.y, 1.0);

    // Standard Qt RHI screen coordinates (+Y is UP, -Y is DOWN)
    vec2 pScreen = vec2(uv.x - 0.5, 0.5 - uv.y) * vec2(aspect, 1.0);
    vec2 mouseVec = vec2(u_pointer.x - 0.5, 0.5 - u_pointer.y) * vec2(aspect, 1.0);

    float t = u_time;

    // ------------------------------------------------------------------------
    // 1. Background Moonlit Canopy & Architectural Depth
    // ------------------------------------------------------------------------
    vec3 bgColor = evalBackdrop(pScreen, t, aspect);

    // ------------------------------------------------------------------------
    // 2. Organic Wind Sway, Elastic Mouse Pull & Shatter Displacement
    // ------------------------------------------------------------------------
    vec2 p = pScreen;

    // Gentle, organic multi-octave wind displacement (active in silence!)
    vec2 windDisp = evalWindOffset(p, t, u_tension);
    p -= windDisp;

    // Subtle tactile elastic pull near the mouse cursor
    vec2 toMouse = pScreen - mouseVec;
    float mouseProx = exp(-dot(toMouse, toMouse) * 18.0);
    vec2 ptrPull = clamp(u_pointer_vel * 0.14, vec2(-0.045), vec2(0.045)) * mouseProx;
    p -= ptrPull;

    // Central structural hub (slightly off-center like a natural orb web)
    vec2 hub = vec2(0.05 * aspect, 0.03) + u_ambient_drift * 0.08;

    // Auth Failed Resonant Shatter: high-frequency fracture displacement
    if (u_shockwave_intensity > 0.01) {
        float fracture = noise2D(p * 22.0 + vec2(mod(t * 10.0, 256.0))) * u_shockwave_intensity * 0.065;
        p += normalize(p - hub + vec2(0.001)) * fracture;
    }

    vec2 toHub = p - hub;
    float r = length(toHub);
    float phi = atan(toHub.y, toHub.x); // -PI to +PI

    // ------------------------------------------------------------------------
    // 3. Radial Silk Strands (Signed Distance + Physical String Harmonics)
    // ------------------------------------------------------------------------
    float angleStep = TAU / NUM_RADIALS;
    float approxIdx = floor((phi + PI) / angleStep);

    // Backspace Harmonic Dampener: mutes vibrations when vortexSpeed < 0
    float dampFactor = (u_vortex_speed < 0.0) ? clamp(1.0 + u_vortex_speed * 1.5, 0.05, 1.0) : 1.0;

    // Keystroke coordinate in screen space
    vec2 keyVec = vec2(u_keystroke_pos.x - 0.5, 0.5 - u_keystroke_pos.y) * vec2(aspect, 1.0);
    float keyAngle = atan(keyVec.y - hub.y, keyVec.x - hub.x);

    // Standing wave envelope along radial length
    float rMax = 1.25;
    float rNorm = clamp(r / rMax, 0.0, 1.0);
    float fundamentalWave = sin(rNorm * PI);
    float secondHarmonic = sin(rNorm * TAU);

    // Find closest radial spoke (check 3 neighbors to cleanly handle jitter & vibration!)
    float bestRadialDist = 10.0;
    float bestSignedDist = 10.0;
    float bestSpokeAngle = 0.0;
    float bestSpokeIdx = 0.0;
    float bestWaveSway = 0.0;
    float bestKeyPluck = 0.0;

    // Track the two spokes bracketing phi for exact catenary span
    float leftSpokeAngle = 0.0;
    float rightSpokeAngle = 0.0;
    float minPosDiff = 10.0;
    float minNegDiff = 10.0;

    for (int offset = -2; offset <= 2; ++offset) {
        float idx = mod(approxIdx + float(offset) + NUM_RADIALS, NUM_RADIALS);
        float sAngle = getSpokeAngle(idx);
        float dAng = angleDiff(phi, sAngle);

        if (dAng >= 0.0 && dAng < minPosDiff) {
            minPosDiff = dAng;
            rightSpokeAngle = sAngle;
        }
        if (dAng < 0.0 && -dAng < minNegDiff) {
            minNegDiff = -dAng;
            leftSpokeAngle = sAngle;
        }

        // Signed perpendicular distance from sample point to radial ray (NO abs() folding!)
        float signedDist = r * sin(dAng);

        // Localized keystroke pluck
        float angleDistKey = abs(angleDiff(sAngle, keyAngle));
        float keyPluck = exp(-pow(angleDistKey * 3.5, 2.0)) * u_keystroke_energy;

        // Localized mouse pluck
        float mouseDist = length(pScreen - mouseVec);
        float mousePluck = exp(-mouseDist * 6.5) * u_pluck_amplitude;

        // Subtle, slow idle relaxation ripple traveling down occasional threads
        float relaxPhase = mod(t * 0.42 + idx * 1.91, 9.0);
        float relaxPulse = exp(-pow((r - relaxPhase * 0.22) * 5.5, 2.0)) * exp(-relaxPhase * 0.35);
        float idleRelax = sin(wrapPhase(r * 10.0 - t * 2.2 + idx)) * relaxPulse * 0.0018 * fundamentalWave;

        // Audio-reactive standing wave antinodes (strictly 0 when u_bass == 0)
        float bassWave = sin(wrapPhase(r * 18.0 - t * 13.0 + idx * 0.7)) * fundamentalWave * (u_bass * 0.011 + u_pad1 * 0.004);

        // Plucked string transverse harmonic oscillation (fundamental + 2nd harmonic)
        float pluckAmp = keyPluck + mousePluck;
        float pluckWave = (
            fundamentalWave * sin(wrapPhase(t * 34.0 + idx * 1.3)) * 0.013 +
            secondHarmonic * sin(wrapPhase(t * 68.0 + idx * 2.1)) * 0.005
        ) * pluckAmp;

        float totalSway = (idleRelax + bassWave + pluckWave) * dampFactor;
        float dRadial = abs(signedDist - totalSway);

        if (dRadial < bestRadialDist) {
            bestRadialDist = dRadial;
            bestSignedDist = signedDist;
            bestSpokeAngle = sAngle;
            bestSpokeIdx = idx;
            bestWaveSway = totalSway;
            bestKeyPluck = keyPluck;
        }
    }

    // Gossamer silk thread thickness (delicate, screen-resolution aware)
    float radialCore = max(px * 0.78, 0.00085 * (0.85 + u_tension * 0.15));
    float radialSilk = smoothstep(radialCore * 2.1, radialCore * 0.25, bestRadialDist);
    // Slight fade in very center knot so spokes don't pile into a blown-out white star
    radialSilk *= smoothstep(0.006, 0.032, r);

    // Subtle directional moonlight sheen along the radial tangent
    vec2 spokeDir = vec2(cos(bestSpokeAngle), sin(bestSpokeAngle));
    float radialSheen = 0.65 + 0.35 * abs(dot(spokeDir, normalize(vec2(-0.55, 0.65))));

    // Physical string vibration glow & soft harmonic motion-blur envelope
    float activeVib = (abs(bestWaveSway) * 55.0 + bestKeyPluck * 1.2 + u_mids * 0.55 + u_pad1 * 0.35) * dampFactor;
    float stringBlur = exp(-abs(bestSignedDist) / (abs(bestWaveSway) * 1.3 + 0.0018)) * clamp(activeVib * 0.28, 0.0, 0.65);
    vec3 radialResonance = u_color_resonance.rgb * (radialSilk * activeVib * 0.85 + stringBlur * 0.45);

    // ------------------------------------------------------------------------
    // 4. Organic Orb-Weaver Capture Spiral & Hub Stabilimentum Mesh
    // ------------------------------------------------------------------------
    float spanAngle = max(0.08, minPosDiff + minNegDiff);
    float sectorT = clamp(minPosDiff / spanAngle, 0.0, 1.0); // 0 at right spoke, 1 at left spoke

    // True span-proportional catenary sag: sags deepest at midpoint (sectorT = 0.5)
    float catenaryArc = 4.0 * sectorT * (1.0 - sectorT);
    float sagCoeff = spanAngle * (0.14 + 0.09 / max(0.55, 0.45 + u_tension * 0.55));
    float catenaryFactor = 1.0 + sagCoeff * catenaryArc;

    // Gentle acoustic flutter on spiral rings when mids/treble ring
    float spiralFlutter = sin(wrapPhase(sectorT * PI)) * sin(wrapPhase(t * 24.0 + r * 30.0)) * u_mids * 0.0035 * dampFactor;
    float saggedR = r * catenaryFactor + spiralFlutter;

    // Progressive spiral spacing
    float spiralSpacing = 0.028 * (0.92 + u_tension * 0.08);
    float kFloat = radiusToSpiralIndex(saggedR, spiralSpacing);
    float kNear = floor(kFloat + 0.5);

    float ringR = spiralIndexToRadius(kNear, spiralSpacing);
    float spiralDist = abs(saggedR - ringR);

    // Capture spiral threads are finer and more gossamer than primary radial spokes
    float spiralCore = max(px * 0.62, 0.00062);
    float spiralSilk = smoothstep(spiralCore * 2.0, spiralCore * 0.2, spiralDist);
    // Start capture spiral outside the hub free-zone, fade gently at far outer corners
    spiralSilk *= smoothstep(0.068, 0.095, r) * smoothstep(1.38, 1.05, r);

    // Delicate concentric hub mesh (inner web core)
    float hubRingSpacing = 0.014;
    float hubDist = abs(mod(r + hubRingSpacing * 0.5, hubRingSpacing) - hubRingSpacing * 0.5);
    float hubMesh = smoothstep(spiralCore * 1.9, spiralCore * 0.2, hubDist) * smoothstep(0.072, 0.052, r) * smoothstep(0.010, 0.022, r);

    // Tangent sheen along the spiral thread
    vec2 spiralTan = vec2(-sin(phi), cos(phi));
    float spiralSheen = 0.55 + 0.45 * abs(dot(spiralTan, normalize(vec2(-0.55, 0.65))));

    // ------------------------------------------------------------------------
    // 5. Composite Silk Lattice over Backdrop
    // ------------------------------------------------------------------------
    vec3 sceneColor = bgColor;

    // Subtle pointer resonator halo (gentle, not overpowering)
    float pointerDist = length(pScreen - mouseVec);
    float pointerGlow = exp(-pointerDist * 9.0) * (0.06 + u_mids * 0.22 + u_pluck_amplitude * 0.25);
    sceneColor += u_color_resonance.rgb * pointerGlow;

    // Gossamer silk threads (clean hierarchy: radials > capture spirals > hub mesh)
    vec3 radialCol = u_color_silk.rgb * radialSilk * (0.72 * radialSheen);
    vec3 spiralCol = u_color_silk.rgb * (spiralSilk * 0.48 * spiralSheen + hubMesh * 0.35);
    vec3 spiralGlow = u_color_resonance.rgb * spiralSilk * (u_mids * 0.45 + u_treble * 0.35) * dampFactor;

    sceneColor += radialCol + spiralCol + radialResonance + spiralGlow;

    // ------------------------------------------------------------------------
    // 6. Crystalline Morning Dewdrops (Optical Prisms with Refraction)
    // ------------------------------------------------------------------------
    // A) Primary droplets seated at radial-spiral intersections
    if (kNear >= 1.0 && ringR > 0.075 && ringR < 1.15) {
        vec2 dropPos = hub + vec2(cos(bestSpokeAngle), sin(bestSpokeAngle)) * ringR;
        // Droplet rides seamlessly with the radial thread's transverse wave!
        dropPos += vec2(-sin(bestSpokeAngle), cos(bestSpokeAngle)) * bestWaveSway;

        float dropSeed = hash12(vec2(bestSpokeIdx * 3.17 + 1.1, kNear * 5.41 + 2.3));
        if (dropSeed < u_dew_density) {
            float sizeRand = hash12(vec2(bestSpokeIdx * 9.7, kNear * 7.3));
            // Skew distribution so most drops are delicate beads and a few are lush prisms
            float dropRadius = mix(0.0038, 0.0115, sizeRand * sizeRand);
            vec4 dew = evalDewdrop(p, dropPos, dropRadius, mouseVec, t, aspect, px);
            sceneColor = mix(sceneColor, dew.rgb, dew.a) + dew.rgb * (1.0 - dew.a);
        }
    }

    // B) Smaller glistening micro-beads strung directly along the sagging spiral threads
    if (kNear >= 2.0 && ringR > 0.12 && ringR < 1.12) {
        // Place up to 2 micro-beads along the span between spokes, solved analytically onto the spiral curve
        float midT = (sectorT < 0.5) ? 0.33 : 0.67;
        float beadAngle = rightSpokeAngle + midT * spanAngle;
        float beadArc = 4.0 * midT * (1.0 - midT);
        float beadCatFactor = 1.0 + sagCoeff * beadArc;
        float beadRBase = ringR / beadCatFactor;
        float beadFlutter = sin(wrapPhase(midT * PI)) * sin(wrapPhase(t * 24.0 + beadRBase * 30.0)) * u_mids * 0.0035 * dampFactor;
        float beadR = max(0.08, (ringR - beadFlutter) / beadCatFactor);
        vec2 beadPos = hub + vec2(cos(beadAngle), sin(beadAngle)) * beadR;

        float beadSlot = (sectorT < 0.5) ? 1.0 : 2.0;
        float sectorSeedIdx = floor(mod(rightSpokeAngle + PI, TAU) / angleStep + 0.5);
        float beadSeed = hash12(vec2(sectorSeedIdx * 11.3 + beadSlot * 4.7, kNear * 8.9));
        if (beadSeed < u_dew_density * 0.62) {
            float beadRadius = mix(0.0024, 0.0056, hash12(vec2(beadSeed * 19.1, kNear * 3.1)));
            vec4 bead = evalDewdrop(p, beadPos, beadRadius, mouseVec, t, aspect, px);
            sceneColor = mix(sceneColor, bead.rgb, bead.a) + bead.rgb * (1.0 - bead.a);
        }
    }

    // ------------------------------------------------------------------------
    // 7. Screensaver Lifecycle Phenomena
    // ------------------------------------------------------------------------
    // Wrong Password: Resonant Shatter & Frost Shards
    if (u_shockwave_intensity > 0.01) {
        float shardNoise = hash12(floor(p * 50.0 + vec2(mod(t * 20.0, 256.0))));
        float shardSpark = pow(shardNoise, 16.0) * u_shockwave_intensity * 3.0;
        vec3 frostShard = mix(vec3(0.7, 0.9, 1.0), vec3(1.0, 0.25, 0.15), u_shockwave_intensity);
        sceneColor += frostShard * shardSpark;
    }

    // Correct Password: Consonant Golden Dissolution (Untethers to Desktop)
    if (u_vortex_speed > 2.0) {
        float goldSpeed = u_vortex_speed - 2.0;
        float goldFlare = sin(wrapPhase(t * 8.0)) * 0.5 + 0.5;
        vec3 goldLight = mix(vec3(1.0, 0.85, 0.3), vec3(1.0, 0.98, 0.85), goldFlare);
        sceneColor = mix(sceneColor, goldLight * (sceneColor * 2.0 + vec3(0.45)), clamp(goldSpeed * 0.65, 0.0, 0.94));
    }

    // Gentle filmic shoulder so bright glints never clip harshly
    sceneColor = sceneColor / (vec3(1.0) + sceneColor * 0.22);

    fragColor = vec4(sceneColor, 1.0) * qt_Opacity;
}
