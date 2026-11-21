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
    vec3 u_color_bg;
    vec3 u_color_dye1;
    vec3 u_color_dye2;
    vec3 u_color_dye3;
    float u_time;
    float u_keystroke_energy;
    float u_shockwave_intensity;
    float u_vortex_speed;
    float u_bass;
    float u_mids;
    float u_treble;
};

// --- Sine-Free, Float32-Safe Periodic Hash & C2-Continuous Gradient Noise ---
vec2 hash22(vec2 p) {
    vec2 q = mod(p, 256.0);
    vec3 p3 = fract(vec3(q.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    vec2 h = fract((p3.xx + p3.yz) * p3.zy);
    return h * 2.0 - 1.0;
}

float gradNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    // Quintic Hermite curve for C2 continuity (smooth fluid derivatives & speculars)
    vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);

    float a = dot(hash22(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0));
    float b = dot(hash22(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
    float c = dot(hash22(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
    float d = dot(hash22(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));

    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// 3-octave smooth fBm for fluid streamfunctions
float fbm3(vec2 p) {
    float v = 0.0;
    float a = 0.52;
    const mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
    for (int i = 0; i < 3; ++i) {
        v += a * gradNoise(p);
        p = rot * p * 2.03 + vec2(17.1, 31.7);
        a *= 0.50;
    }
    return v;
}

// 4-octave fBm for rich dye density and silky filament detail
float fbm4(vec2 p) {
    float v = 0.0;
    float a = 0.52;
    const mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
    for (int i = 0; i < 4; ++i) {
        v += a * gradNoise(p);
        p = rot * p * 2.02 + vec2(13.7, 29.3);
        a *= 0.48;
    }
    return v;
}

// Incompressible Divergence-Free Curl Noise: u = (dPsi/dy, -dPsi/dx)
vec2 curlField(vec2 p, vec2 drift) {
    const float eps = 0.035;
    vec2 q = p + drift;
    float n1 = fbm3(q + vec2(0.0, eps));
    float n2 = fbm3(q - vec2(0.0, eps));
    float n3 = fbm3(q + vec2(eps, 0.0));
    float n4 = fbm3(q - vec2(eps, 0.0));
    return vec2(n1 - n2, -(n3 - n4)) / (2.0 * eps);
}

// Evaluate selective luminous neon filaments carved through deep black obsidian
vec3 sampleDyes(vec2 q, vec2 drift, float tSlow, float audioBass, float audioMids, float audioTreble) {
    // Macro obsidian void envelope: carves wide, deep black liquid obsidian rivers (~55% dark abyss)
    float voidField = fbm3(q * 0.78 + drift * 0.22);
    float channel1 = smoothstep(-0.06, 0.30, voidField);
    float channel2 = smoothstep(-0.08, 0.28, -voidField + 0.04);

    // Primary dye (e.g. Electric Cyan): sweeping glowing filaments & deep subsurface plumes
    float n1 = fbm4(q * 1.25 + drift * 0.45);
    float ridge1 = smoothstep(0.66, 0.99, 1.0 - abs(n1 * 3.8));
    float plume1 = smoothstep(0.22, 0.58, n1);
    float d1 = (ridge1 * 0.92 + plume1 * 0.36) * mix(0.04, 1.0, channel1);
    d1 = clamp(d1 * (0.92 + audioBass * 0.40), 0.0, 1.25);

    // Secondary dye (e.g. Hot Magenta): counter-flowing folded silk veins
    vec2 q2 = mat2(0.866, -0.5, 0.5, 0.866) * q;
    float n2 = fbm4(q2 * 1.45 - drift * 0.38 + vec2(4.2, -2.7));
    float ridge2 = smoothstep(0.68, 0.99, 1.0 - abs(n2 * 4.0));
    float plume2 = smoothstep(0.24, 0.58, n2);
    float d2 = (ridge2 * 0.92 + plume2 * 0.34) * mix(0.04, 1.0, channel2);
    d2 = clamp(d2 * (0.92 + audioMids * 0.42), 0.0, 1.25);

    // Tertiary dye (e.g. Solar Amber / Ultraviolet): fine luminous caustic threads
    vec2 q3 = mat2(0.5, 0.866, -0.866, 0.5) * q;
    float n3 = fbm3(q3 * 2.05 + vec2(tSlow * 0.28, -tSlow * 0.20) + vec2(-3.1, 6.4));
    float ridge3 = smoothstep(0.76, 0.995, 1.0 - abs(n3 * 4.2));
    float d3 = clamp(ridge3 * (0.70 + audioTreble * 0.45), 0.0, 1.2);

    return vec3(d1, d2, d3);
}

// Deep-black-preserving HDR knee: keeps obsidian dark and neon colors deeply saturated
vec3 neonToneMap(vec3 x) {
    return x / (1.0 + x * 0.58);
}

void main() {
    // 1. Aspect-Normalized Coordinates
    vec2 aspect = vec2(u_resolution.x / max(u_resolution.y, 1.0), 1.0);
    vec2 uv = (qt_TexCoord0 - 0.5) * aspect;
    vec2 pointer = (u_pointer - 0.5) * aspect;
    vec2 keyPos = (u_keystroke_pos - 0.5) * aspect;
    vec2 beatCenter = (u_beat_center - 0.5) * aspect;

    // 2. Audio Energy Above Silence Floor (strictly 0.0 when silent/idle)
    float audioBass = smoothstep(0.11, 0.85, u_bass);
    float audioMids = smoothstep(0.09, 0.80, u_mids);
    float audioTreble = smoothstep(0.09, 0.80, u_treble);

    // 3. Monotonic, Float32-Safe Viscous Convection Clocks (u_time is monotonically integrated)
    float tFlow = u_time * 0.095;
    float angle1 = mod(u_time * 0.032, 6.2831853);
    float angle2 = mod(u_time * 0.023, 6.2831853);
    // Gentle meandering oceanic drift (viscous, tranquil flow with zero fixed-direction bias)
    vec2 oceanDrift = vec2(
        tFlow * 0.45 + 0.30 * sin(angle1),
        tFlow * 0.26 + 0.30 * cos(angle2)
    ) + u_ambient_drift * 0.65;

    // 4. Multi-Stage Viscous Curl Advection (Lagrangian Back-Tracing)
    // Stage 1: Large sweeping oceanic convection eddies
    vec2 p0 = uv * 1.35;
    vec2 v1 = curlField(p0 * 0.85, oceanDrift * 0.42);

    // Interactive Pointer Paddle & Vortex (strictly gated on pointer movement — zero center pinch at rest!)
    float ptrSpeed = length(u_pointer_vel);
    float ptrActive = smoothstep(0.0004, 0.015, ptrSpeed);
    vec2 vInteract = vec2(0.0);
    if (ptrActive > 0.001) {
        vec2 toPtr = uv - pointer;
        float distPtr = length(toPtr);
        float ptrFalloff = exp(-distPtr * 4.5);
        vec2 ptrSwirl = vec2(-toPtr.y, toPtr.x) / (distPtr + 0.14);
        vInteract += (u_pointer_vel * 6.5 + ptrSwirl * 0.85 * min(1.0, ptrSpeed * 12.0)) * ptrFalloff * ptrActive;
    }

    // Directional Keystroke Dye Push & Micro-Swirl
    if (u_keystroke_energy > 0.01) {
        vec2 toKey = uv - keyPos;
        float distKey = length(toKey);
        float keyInfluence = exp(-distKey * 5.2) * u_keystroke_energy;
        vec2 keySwirl = vec2(-toKey.y, toKey.x) / (distKey + 0.10);
        vInteract += (u_keystroke_dir * 1.8 + keySwirl * 0.55) * keyInfluence;
    }

    // Audio-Driven Convection Jets (only active when real sound is present; singularity-free!)
    if (audioBass > 0.005) {
        vec2 toBeat = uv - beatCenter;
        float distBeat = length(toBeat);
        vec2 outwardBeat = toBeat / (distBeat + 0.14);
        vInteract += outwardBeat * audioBass * exp(-distBeat * 2.5) * 0.70;

        // Smooth inward perimeter jets on bass hits
        float edgeDist = min(min(qt_TexCoord0.x, 1.0 - qt_TexCoord0.x), min(qt_TexCoord0.y, 1.0 - qt_TexCoord0.y));
        vec2 inwardDir = -uv / (length(uv) + 0.20);
        vInteract += inwardDir * audioBass * exp(-edgeDist * 5.5) * 0.50;
    }

    // Cavitation Shockwave Radial Displacement
    float shockRing = 0.0;
    if (u_shockwave_intensity > 0.01) {
        float centerDist = length(uv);
        float shockRadius = (1.0 - u_shockwave_intensity) * 1.5;
        shockRing = exp(-pow((centerDist - shockRadius) * 10.0, 2.0));
        vec2 radialDir = uv / (centerDist + 0.08);
        vInteract += radialDir * shockRing * u_shockwave_intensity * 1.15;
    }

    // Stage 2: Mid-scale viscous folding (creates silky, swirling liquid filaments)
    vec2 p1 = p0 - (v1 * 0.24 + vInteract * 0.22);
    vec2 v2 = curlField(p1 * 1.48, -oceanDrift * 0.34 + vec2(3.7, 1.9));

    // Stage 3: Fine curl turbulence (gentle organic eddies in silence, livelier on treble/mids)
    float turbStrength = 0.075 + audioMids * 0.050 + audioTreble * 0.055;
    vec2 p2 = p1 - v2 * (0.14 + audioMids * 0.04);
    vec2 v3 = curlField(p2 * 2.55, oceanDrift * 0.55 + vec2(-5.3, 4.1));
    vec2 pFluid = p2 - v3 * turbStrength;

    // 5. Evaluate Advected Dye Tracers (with subtle chromatic dispersion on strong shock/bass)
    float chromaAmt = (u_shockwave_intensity * shockRing * 0.032) + (audioBass * audioBass * 0.010);
    vec3 dyes;
    if (chromaAmt > 0.001) {
        vec2 chromaDir = uv / (length(uv) + 0.25);
        vec3 dR = sampleDyes(pFluid + chromaDir * chromaAmt, oceanDrift, tFlow, audioBass, audioMids, audioTreble);
        vec3 dG = sampleDyes(pFluid, oceanDrift, tFlow, audioBass, audioMids, audioTreble);
        vec3 dB = sampleDyes(pFluid - chromaDir * chromaAmt, oceanDrift, tFlow, audioBass, audioMids, audioTreble);
        dyes = vec3(dR.x, dG.y, dB.z);
    } else {
        dyes = sampleDyes(pFluid, oceanDrift, tFlow, audioBass, audioMids, audioTreble);
    }

    // 6. Deep Liquid Obsidian Base + Saturated Luminous Neon Dye Composition
    // Rich dark obsidian substrate (preserves true abyssal blacks in dye troughs)
    vec3 color = u_color_bg * 0.32;

    // Subsurface diffused neon glow suspended inside the black liquid
    float sub1 = smoothstep(0.08, 0.72, dyes.x);
    float sub2 = smoothstep(0.08, 0.72, dyes.y);
    float sub3 = smoothstep(0.12, 0.78, dyes.z);
    color += u_color_dye1 * sub1 * 0.32;
    color += u_color_dye2 * sub2 * 0.30;
    color += u_color_dye3 * sub3 * 0.26;

    // Radiant neon filament crests (optical bloom core, saturated jewel tones)
    float core1 = pow(clamp(dyes.x, 0.0, 1.0), 2.5);
    float core2 = pow(clamp(dyes.y, 0.0, 1.0), 2.5);
    float core3 = pow(clamp(dyes.z, 0.0, 1.0), 2.4);
    float energyGlow = 0.90 + audioBass * 0.40 + audioMids * 0.30;
    color += u_color_dye1 * core1 * 1.05 * energyGlow;
    color += u_color_dye2 * core2 * 1.00 * energyGlow;
    color += u_color_dye3 * core3 * 1.05 * energyGlow;

    // Subtle hot silk core only where primary & secondary filament peaks intersect
    float seam = pow(clamp(core1 * core2 * 2.0, 0.0, 1.0), 1.8);
    color += (mix(u_color_dye1, u_color_dye2, 0.5) + vec3(0.30)) * seam * 0.65;

    // 7. Subtle Acoustic Cymatic Standing Waves (only on active audio)
    if (audioBass > 0.15) {
        float distBeat = length(uv - beatCenter);
        float cymatic = sin(distBeat * 22.0 - mod(u_time * 4.2, 6.2831853)) * 0.5 + 0.5;
        float cymaticEnv = exp(-distBeat * 2.8) * (audioBass - 0.15);
        color += mix(u_color_dye1, u_color_dye3, 0.5) * pow(cymatic, 4.5) * cymaticEnv * 0.32;
    }

    // 8. Directional Keystroke Dye Splat Rendering
    if (u_keystroke_energy > 0.01) {
        float splatDist = length(uv - keyPos);
        float splatWave = sin(splatDist * 20.0 - mod(u_time * 8.0, 6.2831853)) * 0.5 + 0.5;
        float splatFalloff = exp(-splatDist * 6.0);
        float splatIntensity = splatFalloff * u_keystroke_energy;
        vec3 keyDye = mix(u_color_dye2, u_color_dye3, splatWave);
        color += keyDye * splatIntensity * 1.35;
    }

    // 9. Cavitation Detonation Shockwave Flash (Auth Failed / Strong Downbeat)
    if (u_shockwave_intensity > 0.01) {
        float centerDist = length(uv);
        vec3 shockTint = mix(u_color_dye2, vec3(1.0, 0.10, 0.20), 0.65);
        vec3 shockColor = mix(shockTint, vec3(1.0, 0.92, 0.85), shockRing * 0.50);
        color += shockColor * (shockRing * 0.78 + 0.14 * exp(-centerDist * 2.5)) * u_shockwave_intensity;
    }

    // 10. Smooth Glossy Liquid Obsidian Surface Tension Specular (anti-aliased dFdx/dFdy)
    // Use smooth low-frequency liquid swell height (no sharp ridge spikes -> zero pixel sparkle)
    float smoothH = fbm3(p2 * 1.10 + oceanDrift * 0.25) * 0.55 + (sub1 * 0.22 + sub2 * 0.20 + sub3 * 0.12);
    vec2 rawGrad = vec2(dFdx(smoothH), dFdy(smoothH)) * u_resolution.y * 0.020;
    // Softly saturate slope magnitude to prevent single-pixel specular aliasing
    vec2 gradH = rawGrad / (1.0 + length(rawGrad) * 1.3);
    vec3 normal = normalize(vec3(-gradH.x, -gradH.y, 1.0));

    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    vec3 lightDir1 = normalize(vec3(0.32, 0.52, 0.88));
    vec3 halfVec1 = normalize(lightDir1 + viewDir);
    float spec1 = pow(max(dot(normal, halfVec1), 0.0), 48.0);

    vec3 lightDir2 = normalize(vec3(-0.50, -0.28, 0.82));
    vec3 halfVec2 = normalize(lightDir2 + viewDir);
    float spec2 = pow(max(dot(normal, halfVec2), 0.0), 26.0);

    float dyePresence = clamp(sub1 + sub2 + sub3, 0.0, 1.0);
    vec3 dyeTint = normalize(u_color_dye1 * (sub1 + 0.05) + u_color_dye2 * (sub2 + 0.05) + u_color_dye3 * (sub3 + 0.02));
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.5);
    // Crisp wet-obsidian specular highlights that preserve deep black troughs
    color += mix(vec3(0.70, 0.86, 1.0), dyeTint, 0.40) * spec1 * (0.24 + audioTreble * 0.18);
    color += dyeTint * (spec2 * 0.12 + fresnel * 0.16 * dyePresence);

    // 11. Deep-Black-Preserving Neon Tone Mapping & Abyssal Vignette
    color = neonToneMap(color);
    float vignette = smoothstep(1.48, 0.35, length(uv));
    color *= mix(0.45, 1.0, vignette);

    fragColor = vec4(color, 1.0) * qt_Opacity;
}
