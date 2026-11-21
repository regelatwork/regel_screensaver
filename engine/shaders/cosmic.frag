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
    vec2 u_camera_offset;
    float u_disk_tilt;
    float u_disk_inclination;
    float u_hole_scale;
    float u_hyperspace_phase;
    float u_accretion_rate;
    float u_pad;
};

const float PI = 3.14159265;
const float TAU = 6.28318530;

// --- Precision-Safe Sine-Free Polynomial Hashes (range [0, 1]) ---
float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
}

// Smooth value noise in [0, 1] with periodic lattice safety
float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash12(mod(i, 256.0));
    float b = hash12(mod(i + vec2(1.0, 0.0), 256.0));
    float c = hash12(mod(i + vec2(0.0, 1.0), 256.0));
    float d = hash12(mod(i + vec2(1.0, 1.0), 256.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// 4-octave FBM cleanly normalized in [0, 1]
float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
    for (int i = 0; i < 4; ++i) {
        v += a * vnoise(p);
        p = rot * p * 2.03 + vec2(13.7, 7.3);
        a *= 0.5;
    }
    return v / 0.9375;
}

// Ridged multifractal for delicate electric coronal filaments
float ridgedFbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
    for (int i = 0; i < 4; ++i) {
        float n = 1.0 - abs(vnoise(p) * 2.0 - 1.0);
        v += a * n * n;
        p = rot * p * 2.12 + vec2(7.1, 19.3);
        a *= 0.5;
    }
    return v / 0.9375;
}

// Crisp jittered pinpoint starfield layer (no square artifacts, no NaNs)
vec3 starLayer(vec2 coord, float density, float sharpness, float tPhase) {
    vec2 cell = floor(coord);
    vec2 local = fract(coord);
    vec2 rnd = hash22(mod(cell, 512.0));
    float rndId = hash12(mod(cell + vec2(19.1, 47.7), 512.0));

    if (rndId < density) {
        return vec3(0.0);
    }

    vec2 starPos = 0.16 + 0.68 * rnd;
    vec2 diff = local - starPos;
    float d2 = dot(diff, diff);

    // Realistic stellar magnitude power-law distribution
    float mag = (rndId - density) / max(1.0 - density, 0.001);
    float lum = (0.12 + 0.88 * mag * mag * mag);

    // Gentle calm scintillation
    float twinkle = 0.88 + 0.12 * sin(mod(rnd.x * 40.0 + tPhase * (0.35 + rnd.y * 0.55), TAU));

    // Pinpoint core + delicate halo on brightest stars
    float core = exp(-d2 * sharpness);
    float halo = exp(-d2 * (sharpness * 0.16)) * 0.16 * mag * mag;

    // Stellar spectral color temperature (O/B blue-white -> F white -> K/M amber)
    vec3 coolStar = vec3(0.68, 0.84, 1.0);
    vec3 warmStar = vec3(1.0, 0.82, 0.60);
    vec3 starTint = mix(warmStar, coolStar, rnd.y);

    return starTint * (core + halo) * lum * twinkle;
}

// Continuous seam-free Keplerian spiral plasma & luminous dust stream field
float accretionFilaments(vec2 diskP, float rDisk, float tSpin) {
    // Differential Keplerian shear: inner orbits spin faster than outer orbits
    float omega = 1.55 / pow(rDisk + 0.085, 1.15);
    float twist = mod(rDisk * 18.0 - tSpin * omega, TAU);
    float cw = cos(twist);
    float sw = sin(twist);
    vec2 sp = mat2(cw, -sw, sw, cw) * diskP;

    // Swirling plasma bands + fine orbital gas striations + sparkling dust knots
    float f1 = fbm(sp * 9.0 + vec2(rDisk * 6.0, -rDisk * 4.0));
    float f2 = fbm(sp * 22.0 + vec2(-rDisk * 8.0, tSpin * 0.12));
    float streams = 0.5 + 0.5 * sin(rDisk * 85.0 + f1 * 8.5 - tSpin * 0.5);
    float dustKnots = pow(clamp(f2, 0.0, 1.0), 2.4);

    return clamp(f1 * 0.44 + streams * 0.34 + dustKnots * 0.52, 0.0, 1.35);
}

// Smooth ACES Filmic Tone Mapping
vec3 acesToneMap(vec3 x) {
    const float a = 2.51;
    const float b = 0.03;
    const float c = 2.43;
    const float d = 0.59;
    const float e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
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

    // Float32 precision-safe wrapped simulation time
    float tWrapped = mod(u_time, 4096.0);
    float t = tWrapped * u_vortex_speed;
    float tSlow = mod(tWrapped * 0.42, TAU * 64.0);

    // Primary Singularity Location (dynamic camera position prevents monitor burn-in)
    vec2 holePos = centerP + u_camera_offset + u_ambient_drift * 0.22;

    // ------------------------------------------------------------------------
    // 1. Schwarzschild Gravitational Lensing & Spacetime Curvature
    // ------------------------------------------------------------------------
    vec2 toHole = p - holePos;
    float r = length(toHole);
    vec2 holeDir = toHole / max(r, 0.0001);

    // Dynamic Schwarzschild / Shadow radius (calm at rest, breathes with real bass & keystrokes)
    float bassPulse = smoothstep(0.02, 0.85, u_bass);
    float rs = 0.088 * u_hole_scale * (1.0 + bassPulse * 0.22 + u_keystroke_energy * 0.28);
    float rShadow = rs * 1.18;      // Apparent shadow radius (b_crit)
    float rPhoton = rShadow * 1.035; // Razor-thin photon sphere ring

    // GR Light Deflection: theta = 4GM / (c^2 b) ~ r_s / r
    float lensFactor = (rShadow * rShadow) / (r * r + 0.0012) * u_lens_strength;
    vec2 lensedP = p - holeDir * lensFactor * 0.18;

    // Secondary Singularity (Cursor Binary Micro-lens, fades out when parked near center)
    vec2 toPointer = p - pointerP;
    float rPointer = length(toPointer);
    float pointerSep = length(pointerP - holePos);
    float pointerActive = smoothstep(rShadow * 1.4, rShadow * 2.6, pointerSep);
    float microLens = (0.0022 / (rPointer * rPointer + 0.0028)) * u_lens_strength * pointerActive;
    lensedP -= (toPointer / max(rPointer, 0.0001)) * microLens * 0.10;

    // Gravitational Spacetime Metric Waves (LIGO ripples, only when real bass is present)
    if (u_bass > 0.03) {
        float waveAmp = smoothstep(0.03, 0.45, u_bass) * 0.0065;
        float metricWave = sin(r * 28.0 - mod(t * 7.5, TAU)) * exp(-r * 3.2) * waveAmp;
        lensedP += holeDir * metricWave;
    }

    // ------------------------------------------------------------------------
    // 2. Deep-Space Starfield & Subtle Interstellar Nebulae
    // ------------------------------------------------------------------------
    vec3 stars = vec3(0.0);
    stars += starLayer(lensedP * 28.0, 0.74, 175.0, tSlow) * 1.15;
    stars += starLayer(lensedP * 58.0 + vec2(11.3, 5.7), 0.78, 220.0, tSlow * 0.8) * 0.82;
    stars += starLayer(lensedP * 118.0 + vec2(3.1, 19.4), 0.84, 260.0, tSlow * 0.6) * 0.52;

    // Subtle Einstein-ring magnification of background stars near the photon sphere
    float starLensBoost = 1.0 + 1.2 * exp(-pow((r - rPhoton * 1.18) / (0.045 * u_hole_scale), 2.0));
    stars *= starLensBoost;

    // Deep velvety cosmic void + atmospheric interstellar dust clouds
    vec2 nebDrift = vec2(tWrapped * 0.005, -tWrapped * 0.003);
    float nebWarp = fbm(lensedP * 2.2 + nebDrift);
    float nebCloud1 = fbm(lensedP * 2.9 + vec2(nebWarp * 0.9, -nebWarp * 0.6));
    float nebCloud2 = fbm(lensedP * 5.0 - nebDrift * 1.2 + vec2(nebCloud1 * 0.65));
    float nebMask = pow(smoothstep(0.32, 0.85, nebCloud1), 1.6);

    vec3 deepVoid = u_color_nebula.rgb * 0.09 + vec3(0.003, 0.004, 0.009);
    vec3 nebTint = mix(u_color_nebula.rgb * 0.95, u_color_disk.rgb * 0.22 + u_color_jets.rgb * 0.20, nebCloud2 * 0.55);
    vec3 nebulaCol = deepVoid + nebTint * nebMask * 0.34;

    // Delicate Electric Coronal Ionization Filaments (only excited by real treble & mids)
    float highEnergy = smoothstep(0.06, 0.65, u_treble * 1.0 + u_mids * 0.6);
    if (highEnergy > 0.005) {
        vec2 ionPos = lensedP * 5.2 + vec2(mod(t * 0.14, 64.0), -mod(t * 0.11, 64.0));
        float ridge = ridgedFbm(ionPos + vec2(nebWarp * 0.8));
        // Sharp, thin wispy lightning veins concentrated near the galactic plane & hole halo
        float ionFilament = pow(clamp(ridge, 0.0, 1.0), 7.5);
        float haloFocus = 0.25 + 0.75 * exp(-r * 1.6);
        nebulaCol += mix(u_color_jets.rgb, u_color_core.rgb, 0.35) * ionFilament * highEnergy * haloFocus * 0.65;
    }

    vec3 cosmos = nebulaCol + stars;

    // ------------------------------------------------------------------------
    // 3. Relativistic Accretion Disk (Primary Equatorial + Lensed Arches)
    //    Note: qt_TexCoord0.y increases downward (+y = bottom, -y = top).
    // ------------------------------------------------------------------------
    float ct = cos(u_disk_tilt);
    float st = sin(u_disk_tilt);
    mat2 rotTilt = mat2(ct, -st, st, ct);
    vec2 rotToHole = rotTilt * toHole;

    // Sleek relativistic disk inclination (edge-on ribbon silhouette)
    float incl = clamp(u_disk_inclination * 1.45, 2.4, 5.2);
    float accRate = clamp(u_accretion_rate, 0.45, 2.2);

    // Relativistic Doppler Beaming: approaching side (rotToHole.x < 0) shifts hot blue-white,
    // receding side (rotToHole.x > 0) shifts rich incandescent amber-crimson
    float losVel = -rotToHole.x / (r + 0.065 * u_hole_scale);
    float dopplerShift = smoothstep(-0.92, 0.92, losVel);
    float dopplerBoost = mix(0.46, 1.55, dopplerShift);

    // Rich plasma color palette (saturated blue-white -> fiery gold-orange -> glowing crimson)
    vec3 hotBlueWhite = mix(u_color_core.rgb, vec3(0.86, 0.95, 1.0), 0.38);
    vec3 midIncandescent = mix(u_color_disk.rgb, vec3(1.0, 0.72, 0.32), 0.22);
    vec3 coolCrimson = u_color_disk.rgb * vec3(0.82, 0.24, 0.08) + vec3(0.16, 0.015, 0.005);

    vec3 dopplerTint = mix(coolCrimson, midIncandescent, smoothstep(0.0, 0.58, dopplerShift));
    dopplerTint = mix(dopplerTint, hotBlueWhite, smoothstep(0.55, 1.0, dopplerShift));

    // --- 3A. Primary Inclined Equatorial Accretion Disk ---
    // Slight vertical offset so the front ribbon hugs the lower-center of the black hole shadow
    vec2 diskCoord = vec2(rotToHole.x, (rotToHole.y - rShadow * 0.10) * incl);
    float diskDist = length(diskCoord);
    float rIn = rShadow * 1.04;
    float rOut = rShadow * 4.90;

    float diskInnerFade = smoothstep(rIn * 0.90, rIn * 1.20, diskDist);
    float diskOuterFade = 1.0 - smoothstep(rOut * 0.38, rOut, diskDist);
    float diskRadial = diskInnerFade * diskOuterFade * exp(-max(diskDist - rIn, 0.0) * (2.6 / max(u_hole_scale, 0.4)));
    float diskFil = accretionFilaments(diskCoord, diskDist, t * 0.85);
    float primaryDensity = diskRadial * (0.36 + 0.92 * diskFil) * accRate;

    // Inner-orbit thermal boost (ISCO glows hottest)
    float innerHeat = exp(-max(diskDist - rIn, 0.0) * (18.0 / max(u_hole_scale, 0.4)));
    vec3 primaryColor = mix(dopplerTint, hotBlueWhite, innerHeat * 0.48) * primaryDensity * dopplerBoost * 1.55;

    // In top-down UV (+y = bottom), the FRONT half of the equatorial disk is rotToHole.y > 0
    // and passes cleanly IN FRONT of the lower face of the black hole shadow!
    float frontHalfMask = smoothstep(-0.014 * u_hole_scale, 0.018 * u_hole_scale, rotToHole.y - rShadow * 0.06);
    float backOcclusion = smoothstep(rShadow * 0.95, rShadow * 1.06, r);
    float primaryVis = mix(backOcclusion, 1.0, frontHalfMask);
    primaryColor *= primaryVis;

    // --- 3B. Gravitationally Lensed Secondary Disk Image (Upper & Lower Einstein Arches) ---
    // In top-down UV, -y is TOP (broad luminous upper arch), +y is BOTTOM (tighter lower under-arch)
    float isUpper = smoothstep(0.02, -0.02, rotToHole.y);
    float warpRadial = max(r - rShadow * 0.97, 0.0);
    float archThickness = mix(0.42, 0.98, isUpper) * rShadow * 0.68;
    float archEnv = smoothstep(rShadow * 0.97, rShadow * 1.05, r)
                  * exp(-pow(warpRadial / max(archThickness, 0.01), 1.35));
    // Strongest curving over the top/bottom poles, blending seamlessly into the equatorial wings
    float polarWeight = smoothstep(0.05, 0.52, abs(rotToHole.y) / max(r, 0.0001));
    float archMask = archEnv * (0.32 + 0.68 * polarWeight) * mix(0.52, 1.0, isUpper);

    // Map lensed arch back to disk plane coordinates for continuous spiral plasma streaks
    vec2 lensedDiskCoord = vec2(rotToHole.x * 1.05, sign(rotToHole.y + 1e-5) * (rShadow * 1.10 + warpRadial * 2.4));
    float lensedDiskR = length(lensedDiskCoord);
    float archFil = accretionFilaments(lensedDiskCoord, lensedDiskR, t * 0.72);
    float archHeat = exp(-warpRadial * (20.0 / max(u_hole_scale, 0.4)));
    vec3 archColor = mix(dopplerTint, hotBlueWhite, archHeat * 0.45)
                   * archMask * (0.38 + 0.85 * archFil) * dopplerBoost * accRate * 1.28;

    // ------------------------------------------------------------------------
    // 4. Razor-Thin Photon Ring & Einstein Gravitational Halo
    // ------------------------------------------------------------------------
    float photonWidth = 0.0058 * u_hole_scale;
    float photonRing = exp(-pow((r - rPhoton) / photonWidth, 2.0));
    float photonSoftHalo = exp(-pow((r - rPhoton * 1.03) / (0.022 * u_hole_scale), 2.0)) * 0.24;
    float photonDoppler = mix(0.58, 1.48, dopplerShift);
    vec3 einsteinColor = mix(u_color_core.rgb, vec3(1.0, 0.95, 0.88), 0.55)
                       * (photonRing * 1.55 + photonSoftHalo)
                       * photonDoppler
                       * (1.0 + u_keystroke_energy * 1.35 + bassPulse * 0.30);

    // Secondary Einstein micro-ring around cursor binary attractor (only when away from center)
    float microEinstein = exp(-pow((rPointer - 0.026) * 75.0, 2.0)) * 0.42 * pointerActive;
    vec3 microRingColor = u_color_jets.rgb * microEinstein;

    // ------------------------------------------------------------------------
    // 5. Delicate Collimated Relativistic Polar Synchrotron Jets
    // ------------------------------------------------------------------------
    float jetX = abs(rotToHole.x);
    float jetY = abs(rotToHole.y);
    float jetWidth = 0.0065 * u_hole_scale + jetY * 0.048;
    float jetCore = exp(-pow(jetX / jetWidth, 2.0));
    float jetSheath = exp(-pow(jetX / (jetWidth * 3.0), 2.0)) * 0.22;
    float jetAxial = smoothstep(rShadow * 0.95, rShadow * 2.10, jetY) * exp(-jetY * 1.85);

    // Subtle laminar outward-streaming plasma (calm at rest, flares on bass/downbeats/keystrokes)
    float jetFlow = fbm(vec2(rotToHole.x * 20.0 / max(u_hole_scale, 0.5), jetY * 6.0 - mod(t * 0.85, 64.0)));
    float jetPower = (0.22 + bassPulse * 0.85 + u_keystroke_energy * 1.40) * accRate;
    vec3 jetInnerCol = mix(u_color_jets.rgb, hotBlueWhite, 0.38);
    vec3 jetColor = (jetInnerCol * jetCore + u_color_jets.rgb * jetSheath)
                  * jetAxial * (0.50 + 0.70 * jetFlow) * jetPower * 1.15;

    // ------------------------------------------------------------------------
    // 6. Interactive Event Phenomena
    // ------------------------------------------------------------------------
    // Keystroke Antimatter Quasar Injection
    vec3 quasarBeam = vec3(0.0);
    if (u_keystroke_energy > 0.01) {
        vec2 toKey = p - keystrokeP;
        float keyDist = length(toKey);
        float keySpark = exp(-keyDist * 24.0) * u_keystroke_energy;
        float quasarBurst = exp(-r * 6.5) * u_keystroke_energy * 1.5;
        quasarBeam = mix(u_color_core.rgb, vec3(1.0), 0.6) * (keySpark * 2.0 + quasarBurst);
    }

    // Backspace Hawking Radiation Ejection
    vec3 hawkingBlast = vec3(0.0);
    if (u_vortex_speed < 0.0) {
        float hawkingWave = sin(r * 36.0 + mod(t * 10.0, TAU)) * exp(-r * 6.5) * clamp(-u_vortex_speed * 0.7, 0.0, 1.5);
        hawkingBlast = vec3(0.75, 0.18, 1.0) * max(0.0, hawkingWave) * 1.8;
    }

    // Wrong Password: Event Horizon Rupture & Gamma-Ray Burst
    vec3 grbFlash = vec3(0.0);
    if (u_shockwave_intensity > 0.01) {
        float grbRadius = (1.0 - u_shockwave_intensity) * 1.5;
        float grbShock = exp(-pow((r - grbRadius) * 14.0, 2.0)) * u_shockwave_intensity;
        vec3 grbCore = vec3(1.0, 0.14, 0.05);
        grbFlash = mix(grbCore, vec3(1.0, 0.95, 0.85), grbShock * 0.7) * (grbShock * 3.0 + exp(-r * 3.0) * u_shockwave_intensity * 1.4);
    }

    // ------------------------------------------------------------------------
    // 7. Composite Cosmic Scene with Event Horizon Occlusion
    // ------------------------------------------------------------------------
    float shadowMask = 1.0 - smoothstep(rShadow * 0.96, rShadow * 1.015, r);
    float edgeDarkening = smoothstep(rShadow * 0.98, rShadow * 1.10, r);

    vec3 bgAndLensed = (cosmos + archColor + jetColor + microRingColor) * edgeDarkening;
    bgAndLensed = mix(bgAndLensed, vec3(0.0), shadowMask);

    // Foreground accretion disk & photon ring composite cleanly over the shadow edge
    vec3 finalColor = bgAndLensed + primaryColor + einsteinColor + quasarBeam + hawkingBlast + grbFlash;

    // Correct Password: Einstein-Rosen Wormhole Warp
    if (u_vortex_speed > 2.2) {
        float warpSpeed = u_vortex_speed - 2.2;
        float warpAngle = atan(toHole.y, toHole.x);
        float warpStreaks = pow(vnoise(vec2(warpAngle * 12.0, r * 2.5 - mod(t * 8.0, 64.0))), 3.0) * warpSpeed * 2.4;
        finalColor += vec3(0.8, 0.9, 1.0) * warpStreaks;
    }

    // ------------------------------------------------------------------------
    // 8. Hyperspace Jump Warp Streaks & Spacetime Flash (Burn-in Protection)
    // ------------------------------------------------------------------------
    if (u_hyperspace_phase > 0.001) {
        float warpPhase = u_hyperspace_phase;
        float warpAngle = atan(toHole.y, toHole.x);
        float streakFreq = 36.0;
        float streakSector = floor((warpAngle + PI) * streakFreq / TAU);
        float streakNoise = hash12(vec2(streakSector, 7.13));
        float streakRadial = 0.5 + 0.5 * sin(warpAngle * streakFreq);
        float streakIntensity = pow(streakRadial * streakNoise, 3.5) * smoothstep(0.05, 0.48, r);

        float flashPeak = sin(warpPhase * PI);
        vec3 warpColor = mix(vec3(0.65, 0.85, 1.0), vec3(1.0), flashPeak);
        vec3 warpEffect = warpColor * streakIntensity * flashPeak * 4.0;
        warpEffect += vec3(0.9, 0.95, 1.0) * pow(flashPeak, 4.0) * 1.5;
        finalColor += warpEffect;
    }

    // Filmic tone mapping
    finalColor = acesToneMap(finalColor * 1.12);

    fragColor = vec4(finalColor, 1.0) * qt_Opacity;
}
