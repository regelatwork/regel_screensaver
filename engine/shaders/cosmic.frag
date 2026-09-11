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
    vec4 u_color_core;
    vec4 u_color_disk;
    vec4 u_color_jets;
    vec4 u_color_nebula;
    float u_time;
    float u_keystroke_energy;
    float u_shockwave_intensity;
    float u_vortex_speed;
    float u_bass;
    float u_mids;
    float u_treble;
    float u_lens_strength;
};

// --- Fast GPU Simplex Noise & Hash ---
vec2 hash22(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float noise2D(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(mix(dot(hash22(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
                   dot(hash22(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
               mix(dot(hash22(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
                   dot(hash22(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(cos(0.48), sin(0.48), -sin(0.48), cos(0.48));
    for (int i = 0; i < 4; ++i) {
        v += a * noise2D(p);
        p = rot * p * 2.04 + vec2(1.5, 0.8);
        a *= 0.5;
    }
    return v;
}

void main() {
    vec2 uv = qt_TexCoord0;
    float aspect = u_resolution.x / max(u_resolution.y, 1.0);
    vec2 p = uv;
    p.x *= aspect;

    vec2 centerP = vec2(0.5 * aspect, 0.5);

    // Interactive Coordinates
    vec2 pointerP = u_pointer;
    pointerP.x *= aspect;

    vec2 keystrokeP = u_keystroke_pos;
    keystrokeP.x *= aspect;

    vec2 beatCenterP = u_beat_center;
    beatCenterP.x *= aspect;

    float t = u_time * u_vortex_speed;

    // Primary Singularity Location (settles near center with subtle drift)
    vec2 holePos = centerP + u_ambient_drift * 0.25;

    // ------------------------------------------------------------------------
    // 1. Schwarzschild Gravitational Lensing & Spacetime Curvature
    // ------------------------------------------------------------------------
    vec2 toHole = p - holePos;
    float r = length(toHole);

    // Dynamic Schwarzschild radius (pulsed by sub-bass and fed by keystroke energy)
    float rs = 0.075 * (1.0 + u_bass * 0.35 + u_keystroke_energy * 0.40);
    float rh = rs * 0.96;         // Event horizon radius
    float rPhoton = rs * 1.50;    // Photon sphere (infinite orbital focusing)

    // GR Light Deflection: theta = 4GM / (c^2 b) ~ 2 rs / r
    float lensFactor = (rs * rs) / (r * r + 0.0008) * u_lens_strength;
    vec2 lensedP = p - normalize(toHole + vec2(0.0001)) * lensFactor * 0.18;

    // Secondary Singularity (Cursor Binary Micro-lens)
    vec2 toPointer = p - pointerP;
    float rPointer = length(toPointer);
    float microLens = 0.0035 / (rPointer * rPointer + 0.002) * u_lens_strength;
    lensedP -= normalize(toPointer + vec2(0.0001)) * microLens * 0.12;

    // Gravitational Spacetime Metric Waves (LIGO ripples from sub-bass transients)
    if (u_bass > 0.05) {
        float metricWave = sin(r * 32.0 - t * 12.0) * exp(-r * 3.5) * u_bass * 0.008;
        lensedP += normalize(toHole + vec2(0.0001)) * metricWave;
    }

    // ------------------------------------------------------------------------
    // 2. Background Deep-Space Starfield & Interstellar Nebulae
    // ------------------------------------------------------------------------
    // Multi-layer star field distorted by gravitational deflection
    vec2 starCoord1 = lensedP * 120.0;
    vec2 starGrid1 = floor(starCoord1);
    vec2 starRand1 = hash22(starGrid1);
    float star1 = pow(starRand1.x, 38.0) * (0.65 + 0.35 * sin(starRand1.y * 50.0 + t * 3.0));

    vec2 starCoord2 = lensedP * 240.0;
    vec2 starGrid2 = floor(starCoord2);
    vec2 starRand2 = hash22(starGrid2);
    float star2 = pow(starRand2.x, 52.0) * 0.85;

    // Background Interstellar Nebulae illuminated by galactic core
    float nebGas1 = fbm(lensedP * 3.2 + vec2(t * 0.02, -t * 0.015));
    float nebGas2 = fbm(lensedP * 5.8 - vec2(-t * 0.025, t * 0.02));
    vec3 nebulaCol = mix(u_color_nebula.rgb, u_color_disk.rgb, nebGas2 * 0.5) * nebGas1 * 0.45;

    // Coronal Ionization Lightning Arcs (excited by high mids & treble)
    if (u_treble > 0.1 || u_mids > 0.1) {
        float ionArc = smoothstep(0.72, 0.76, abs(fbm(lensedP * 8.0 + vec2(t * 0.5)))) * (u_treble * 1.5 + u_mids);
        nebulaCol += u_color_jets.rgb * ionArc * 0.8;
    }

    vec3 cosmos = nebulaCol + vec3(star1 + star2);

    // ------------------------------------------------------------------------
    // 3. Relativistic Accretion Disk with Doppler Beaming
    // ------------------------------------------------------------------------
    // Inclined elliptical projection of Keplerian accretion disk
    vec2 diskCoord = toHole;
    float diskDist = length(vec2(diskCoord.x, diskCoord.y * 2.3)); // Inclined ~ 65 degrees
    float diskAngle = atan(diskCoord.y * 2.3, diskCoord.x);

    // Keplerian orbital angular velocity: omega proportional to r^(-1.5)
    float omega = 4.0 / (diskDist + 0.12);
    float diskPhase = diskAngle - t * omega * 0.8;

    // Volumetric plasma turbulence filaments
    float plasmaTurb = fbm(vec2(diskPhase * 2.2, diskDist * 18.0));
    float innerRadius = rs * 1.8;
    float outerRadius = rs * 6.2;

    float diskEnvelope = smoothstep(innerRadius, innerRadius + 0.03, diskDist) *
                         (1.0 - smoothstep(outerRadius * 0.65, outerRadius, diskDist));
    float diskIntensity = diskEnvelope * (0.7 + 0.6 * plasmaTurb);

    // Relativistic Doppler Beaming: Approaching side (left: diskCoord.x < 0) shines blue-white,
    // receding side (right: diskCoord.x > 0) is red-shifted and dimmed.
    float lineOfSightVel = -diskCoord.x / (diskDist + 0.001); // Positive = moving towards camera
    float dopplerBoost = pow(clamp(1.0 + lineOfSightVel * 0.85, 0.25, 2.8), 3.5);

    // Color shifting: Approaching = blue-white plasma, Receding = deep crimson/amber
    vec3 hotPlasma = u_color_core.rgb * 1.8 + vec3(0.3, 0.5, 0.8);
    vec3 coolPlasma = u_color_disk.rgb * 0.8 + vec3(0.6, 0.1, 0.0);
    vec3 diskColor = mix(coolPlasma, hotPlasma, smoothstep(-0.4, 0.6, lineOfSightVel));
    diskColor *= diskIntensity * dopplerBoost;

    // ------------------------------------------------------------------------
    // 4. Einstein Ring & Gravitational Photon Sphere
    // ------------------------------------------------------------------------
    // Gravitationally focused razor-thin ring at r ~ 1.5 rs
    float einsteinHalo = exp(-pow((r - rPhoton) * 55.0, 2.0));
    vec3 einsteinColor = mix(u_color_core.rgb, vec3(1.0, 0.98, 0.92), 0.7) * einsteinHalo * (1.6 + u_keystroke_energy * 2.2);

    // Secondary Einstein micro-ring around cursor attractor
    float microEinstein = exp(-pow((rPointer - 0.035) * 60.0, 2.0)) * 0.65;
    vec3 microRingColor = u_color_jets.rgb * microEinstein;

    // ------------------------------------------------------------------------
    // 5. Relativistic Polar Plasma Jets
    // ------------------------------------------------------------------------
    // High-energy particle beams collimated along vertical magnetic poles
    float jetDistX = abs(toHole.x);
    float jetDistY = abs(toHole.y);
    float jetCollimation = 42.0 - min(35.0, jetDistY * 20.0);
    float jetProfile = exp(-jetDistX * jetCollimation) * smoothstep(rs * 0.8, rs * 2.5, jetDistY);
    float jetHelix = sin(jetDistY * 30.0 - t * 16.0 + sign(toHole.y) * toHole.x * 25.0);
    float jetGlow = jetProfile * (0.75 + 0.45 * jetHelix) * (0.5 + u_bass * 1.2 + u_keystroke_energy * 2.0);
    vec3 jetColor = u_color_jets.rgb * jetGlow * 2.5;

    // ------------------------------------------------------------------------
    // 6. Interactive Event Phenomena
    // ------------------------------------------------------------------------
    // Keystroke Antimatter Quasar Injection
    vec3 quasarBeam = vec3(0.0);
    if (u_keystroke_energy > 0.01) {
        // High-energy particle stream connecting keystroke coordinate into singularity
        vec2 toKey = p - keystrokeP;
        float keyDist = length(toKey);
        float keySpark = exp(-keyDist * 28.0) * (1.0 + 0.8 * sin(t * 12.0)) * u_keystroke_energy;
        // Radial energy burst from core
        float quasarBurst = exp(-r * 8.0) * u_keystroke_energy * 1.8;
        quasarBeam = mix(u_color_core.rgb, vec3(1.0, 1.0, 1.0), 0.6) * (keySpark * 2.5 + quasarBurst);
    }

    // Backspace Hawking Radiation Ejection (hot violet reverse-decompression wave)
    vec3 hawkingBlast = vec3(0.0);
    if (u_vortex_speed < 0.0) {
        float hawkingDist = r;
        float hawkingWave = sin(hawkingDist * 40.0 + t * 18.0) * exp(-hawkingDist * 7.0) * clamp(-u_vortex_speed * 0.7, 0.0, 1.5);
        hawkingBlast = vec3(0.75, 0.15, 1.0) * max(0.0, hawkingWave) * 2.2;
    }

    // Wrong Password: Event Horizon Rupture & Gamma-Ray Burst
    vec3 grbFlash = vec3(0.0);
    if (u_shockwave_intensity > 0.01) {
        float grbRadius = (1.0 - u_shockwave_intensity) * 1.5;
        float grbShock = exp(-pow((r - grbRadius) * 15.0, 2.0)) * u_shockwave_intensity;
        vec3 grbCore = vec3(1.0, 0.12, 0.04);
        grbFlash = mix(grbCore, vec3(1.0, 0.95, 0.85), grbShock * 0.7) * (grbShock * 3.5 + exp(-r * 3.0) * u_shockwave_intensity * 1.5);
    }

    // ------------------------------------------------------------------------
    // 7. Composite Cosmic Scene & Event Horizon Shadow
    // ------------------------------------------------------------------------
    vec3 finalColor = cosmos;
    finalColor += diskColor;
    finalColor += einsteinColor;
    finalColor += microRingColor;
    finalColor += jetColor;
    finalColor += quasarBeam;
    finalColor += hawkingBlast;
    finalColor += grbFlash;

    // Black Hole Event Horizon Shadow (Singularity absorbs all light within rh)
    float horizonShadow = 1.0 - smoothstep(rh - 0.004, rh + 0.003, r);
    // Gravitational redshift boundary darkening
    float redshiftEdge = smoothstep(rh, rh + 0.015, r);
    finalColor = mix(finalColor * redshiftEdge, vec3(0.0), horizonShadow);

    // Correct Password: Einstein-Rosen Wormhole Warp (accelerates to desktop)
    if (u_vortex_speed > 2.2) {
        float warpSpeed = u_vortex_speed - 2.2;
        float warpStreaks = pow(noise2D(vec2(atan(toHole.y, toHole.x) * 16.0, r * 2.0 - t * 10.0)), 3.0) * warpSpeed * 3.0;
        finalColor += vec3(0.8, 0.9, 1.0) * warpStreaks;
    }

    fragColor = vec4(finalColor, 1.0) * qt_Opacity;
}
