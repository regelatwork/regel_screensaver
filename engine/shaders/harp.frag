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
    float u_bass;                // 208..211 (Standing wave antinodes on radial threads)
    float u_mids;                // 212..215 (Harmonic overtone ringing)
    float u_treble;              // 216..219 (Dewdrop chromatic sparkle & caustics)
    float u_tension;             // 220..223 (Structural lattice tension)
    vec2 u_pluck_point;          // 224..231 (Interactive mouse pluck & displacement)
    float u_pluck_amplitude;     // 232..235 (String displacement distance)
    float u_dew_density;         // 236..239 (Dew droplet condensation coverage)
    float u_chromatic_dispersion;// 240..243 (Prismatic rainbow index)
    float u_shatter_progress;    // 244..247 (Shatter / repair progress)
    float u_pad1;                // 248..251
    float u_pad2;                // 252..255
};

// --- Fast GPU Simplex Noise & Hash ---
float hash12(vec2 p) {
    p = fract(p * vec2(5.3983, 5.4427));
    p += dot(p.yx, p.xy + vec2(21.5351, 14.3137));
    return fract(p.x * p.y * 95.4337);
}

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

void main() {
    vec2 uv = qt_TexCoord0;
    float aspect = u_resolution.x / max(u_resolution.y, 1.0);
    // Standard Qt RHI screen coordinates (+Y is UP, -Y is DOWN)
    vec2 p = vec2(uv.x - 0.5, 0.5 - uv.y) * vec2(aspect, 1.0);

    float t = u_time;

    // ------------------------------------------------------------------------
    // 1. Web Hub & Geometric Coordinate Transformation
    // ------------------------------------------------------------------------
    // Central structural hub with gentle ambient drift sway
    vec2 hub = vec2(0.04 * aspect, -0.02) + u_ambient_drift * 0.12;

    // Auth Failed Resonant Shatter: Displaces geometry with high-frequency fracture waves
    if (u_shockwave_intensity > 0.01) {
        float fracture = noise2D(p * 24.0 + t * 12.0) * u_shockwave_intensity * 0.08;
        p += normalize(p - hub + vec2(0.001)) * fracture;
    }

    vec2 toHub = p - hub;
    float r = length(toHub);
    float phi = atan(toHub.y, toHub.x); // -PI to +PI

    // ------------------------------------------------------------------------
    // 2. Transverse Physical Wave Equation on Radial Strands
    // ------------------------------------------------------------------------
    const float NUM_RADIALS = 18.0;
    float angleStep = 6.2831853 / NUM_RADIALS;
    float sector = (phi + 3.14159265) / angleStep;
    float radialIdx = floor(sector);
    float localAngle = (fract(sector) - 0.5) * angleStep;
    float radialAngle = (radialIdx + 0.5) * angleStep - 3.14159265;

    // Perpendicular distance from sample point to radial ray
    float distRadial = r * sin(abs(localAngle));

    // Interactive Pluck Vibration:
    // Pluck localized from keystroke coordinate
    vec2 keyVec = vec2(u_keystroke_pos.x - 0.5, 0.5 - u_keystroke_pos.y) * vec2(aspect, 1.0);
    float keyAngle = atan(keyVec.y - hub.y, keyVec.x - hub.x);
    float angleDistKey = abs(mod(radialAngle - keyAngle + 3.14159265, 6.2831853) - 3.14159265);
    float keyPluckIntensity = exp(-pow(angleDistKey * 3.5, 2.0)) * u_keystroke_energy;

    // Pluck localized from mouse drag and release
    vec2 mouseVec = vec2(u_pointer.x - 0.5, 0.5 - u_pointer.y) * vec2(aspect, 1.0);
    float mouseDist = length(p - mouseVec);
    float mousePluck = exp(-mouseDist * 8.0) * u_pluck_amplitude;

    // Backspace Harmonic Dampener: Mutes vibrations when vortexSpeed < 0
    float dampFactor = (u_vortex_speed < 0.0) ? clamp(1.0 + u_vortex_speed * 1.5, 0.05, 1.0) : 1.0;

    // Standing wave envelope along string: fundamental mode sin(pi * r / L) + 2nd harmonic
    float rMax = 1.35;
    float fundamentalWave = sin(clamp(r / rMax, 0.0, 1.0) * 3.14159265);
    float secondHarmonic = sin(clamp(r / rMax, 0.0, 1.0) * 6.2831853);

    // Audio-reactive standing wave antinodes on radial threads
    float bassAntinode = sin(r * 22.0 - t * 14.0) * fundamentalWave * u_bass * 0.014;
    float pluckSway = (fundamentalWave * sin(t * 32.0 + radialIdx) * 0.016 + secondHarmonic * sin(t * 64.0) * 0.008) * (keyPluckIntensity + mousePluck);
    float totalWaveSway = (pluckSway + bassAntinode) * dampFactor;

    // Displace radial strand by transverse wave
    distRadial = abs(distRadial - totalWaveSway);

    // Silk thread thickness & physical tension profile
    float silkThickness = 0.0016 * (1.0 + u_tension * 0.25);
    float radialSilk = smoothstep(silkThickness * 2.2, 0.0, distRadial);

    // Acoustic Resonance Glow along the vibrating strand
    float vibrationEnergy = (abs(totalWaveSway) * 45.0 + keyPluckIntensity * 1.5 + u_mids * 0.8) * dampFactor;
    vec3 radialResonance = u_color_resonance.rgb * radialSilk * vibrationEnergy * 2.5;

    // ------------------------------------------------------------------------
    // 3. Polygonal Spiral Silk Capture Lattice
    // ------------------------------------------------------------------------
    float spiralSpacing = 0.036 * (1.0 + u_tension * 0.15);
    // Catenary sag between radial spokes creates authentic polygon web shape
    float catenarySag = (1.0 - cos(localAngle * NUM_RADIALS * 0.5)) * 0.012;
    float saggedR = r - catenarySag;

    float spiralIndex = floor(saggedR / spiralSpacing + 0.5);
    float spiralDist = abs(saggedR - spiralIndex * spiralSpacing);

    // Attenuate spiral near hub center
    float spiralSilk = smoothstep(silkThickness * 1.8, 0.0, spiralDist) * smoothstep(0.06, 0.12, r);
    vec3 spiralColor = u_color_silk.rgb * spiralSilk * 1.4;

    // ------------------------------------------------------------------------
    // 4. Crystalline Morning Dew Drops & Optical Prisms
    // ------------------------------------------------------------------------
    vec3 dewColor = vec3(0.0);
    vec3 causticSparks = vec3(0.0);

    // Locate nearest droplet node at intersection between current radial and spiral coil
    float dropR = spiralIndex * spiralSpacing;
    if (dropR > 0.08 && dropR < 1.1) {
        vec2 dropCenter = hub + vec2(cos(radialAngle), sin(radialAngle)) * dropR;
        // Shift droplet with radial standing wave
        dropCenter += vec2(-sin(radialAngle), cos(radialAngle)) * totalWaveSway;

        float dDrop = length(p - dropCenter);
        float dropSeed = hash12(vec2(radialIdx * 3.17, spiralIndex * 5.41));

        // Droplets condense based on u_dew_density
        if (dropSeed < u_dew_density) {
            float dropRadius = mix(0.006, 0.014, dropSeed);

            if (dDrop < dropRadius * 2.0) {
                float dropMask = smoothstep(dropRadius, dropRadius - 0.002, dDrop);
                vec2 dropNorm2D = (p - dropCenter) / max(dropRadius, 0.001);
                float normSq = dot(dropNorm2D, dropNorm2D);
                float dropZ = sqrt(max(0.0, 1.0 - normSq));
                vec3 dropNormal = normalize(vec3(dropNorm2D, dropZ));

                // Dielectric Fresnel Reflection (Schlick approximation)
                float fresnel = 0.04 + 0.96 * pow(1.0 - dropZ, 5.0);

                // Chromatic Dispersion: Prismatic RGB refractions through spherical droplet
                vec3 prismRainbow;
                prismRainbow.r = sin(dropNorm2D.x * 5.0 + 0.0) * 0.5 + 0.5;
                prismRainbow.g = sin(dropNorm2D.x * 5.0 + 2.094) * 0.5 + 0.5;
                prismRainbow.b = sin(dropNorm2D.x * 5.0 + 4.188) * 0.5 + 0.5;
                prismRainbow = mix(u_color_dew.rgb, prismRainbow, u_chromatic_dispersion);

                // Primary & Secondary Specular Caustic Stars
                vec3 lightDir1 = normalize(vec3(0.4, 0.6, 0.8));
                vec3 lightDir2 = normalize(vec3(mouseVec - dropCenter, 0.3)); // Pointer shines on droplets!

                float spec1 = pow(max(0.0, dot(dropNormal, lightDir1)), 38.0);
                float spec2 = pow(max(0.0, dot(dropNormal, lightDir2)), 52.0) * (1.0 + u_treble * 2.0);
                float starGlint = (spec1 + spec2) * (1.2 + u_treble * 1.5);

                vec3 dropShading = prismRainbow * (0.3 + 0.7 * dropZ) + vec3(fresnel * 0.6) + vec3(1.0) * starGlint;
                dewColor += dropShading * dropMask * 2.2;

                // Micro-lens caustic glint halo around the dewdrop
                float halo = exp(-dDrop * 90.0) * (0.3 + u_treble * 0.8);
                causticSparks += u_color_dew.rgb * halo;
            }
        }
    }

    // ------------------------------------------------------------------------
    // 5. Background Moonlit Architectural Void & Atmospheric Haze
    // ------------------------------------------------------------------------
    // Deep vignette background void
    float bgVignette = 1.0 - length(p) * 0.55;
    vec3 bgColor = u_color_void.rgb * bgVignette;

    // Moonlit silver caustic rays sweeping across the void
    float moonRays = sin(p.x * 6.0 + p.y * 4.0 - t * 0.5) * sin(p.x * 12.0 - p.y * 8.0 + t * 0.3);
    bgColor += u_color_silk.rgb * max(0.0, moonRays) * 0.035;

    // Interactive pointer halo (resonator beacon)
    float pointerDist = length(p - mouseVec);
    float pointerGlow = exp(-pointerDist * 12.0) * (0.2 + u_mids * 0.4);
    bgColor += u_color_resonance.rgb * pointerGlow * 0.4;

    // ------------------------------------------------------------------------
    // 6. Composite Elastic Silk Harp & Resonance Field
    // ------------------------------------------------------------------------
    vec3 sceneColor = bgColor;
    // Silk Threads (Radial + Spiral)
    vec3 silkBase = u_color_silk.rgb * radialSilk * 1.2;
    sceneColor += silkBase;
    sceneColor += spiralColor;
    sceneColor += radialResonance;
    sceneColor += dewColor;
    sceneColor += causticSparks;

    // ------------------------------------------------------------------------
    // 7. Screensaver Lifecycle Phenomena
    // ------------------------------------------------------------------------
    // Wrong Password: Resonant Shatter & Frost Shards
    if (u_shockwave_intensity > 0.01) {
        float shardNoise = hash12(floor(p * 50.0 + t * 20.0));
        float shardSpark = pow(shardNoise, 16.0) * u_shockwave_intensity * 3.5;
        vec3 frostShard = mix(vec3(0.7, 0.9, 1.0), vec3(1.0, 0.2, 0.1), u_shockwave_intensity);
        sceneColor += frostShard * shardSpark;
    }

    // Correct Password: Consonant Golden Dissolution (Untethers to Desktop)
    if (u_vortex_speed > 2.0) {
        float goldSpeed = u_vortex_speed - 2.0;
        float goldFlare = sin(t * 8.0) * 0.5 + 0.5;
        vec3 goldLight = mix(vec3(1.0, 0.85, 0.3), vec3(1.0, 0.98, 0.85), goldFlare);
        // Strands dissolve into golden threads of light
        sceneColor = mix(sceneColor, goldLight * (sceneColor * 2.0 + vec3(0.5)), clamp(goldSpeed * 0.65, 0.0, 0.94));
    }

    fragColor = vec4(sceneColor, 1.0) * qt_Opacity;
}
