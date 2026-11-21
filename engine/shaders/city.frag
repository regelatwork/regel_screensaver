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
    vec4 u_color_sky;            // 128..143 (Horizon / Sunset / Night sky)
    vec4 u_color_neon1;          // 144..159 (Primary cyber cyan / headlights)
    vec4 u_color_neon2;          // 160..175 (Secondary hot magenta / amber / taillights)
    vec4 u_color_grid;           // 176..191 (Ground grid / wireframe mountains)
    float u_time;                // 192..195
    float u_keystroke_energy;    // 196..199
    float u_shockwave_intensity; // 200..203 (Auth fail / glitch / sirens)
    float u_vortex_speed;        // 204..207 (Flight speed / rocket climb / backspace EMP)
    float u_bass;                // 208..211 (Building height EQ modulation & rooftop strobes)
    float u_mids;                // 212..215 (Holographic billboards & hovercraft streams)
    float u_treble;              // 216..219 (Rain sparkle & neon window shimmer)
    float u_searchlight_power;   // 220..223 (Mouse cursor drone searchlight intensity)
    vec2 u_camera_tilt;          // 224..231 (Interactive camera pitch & yaw)
    float u_rain_density;        // 232..235 (Volumetric rain & lens droplets)
    float u_grid_scroll;         // 236..239 (Highway forward flight velocity)
    float u_fog_density;         // 240..243 (Atmospheric cyberpunk smog)
    float u_pad0;                // 244..247
    float u_pad1;                // 248..251
    float u_pad2;                // 252..255
};

const float PI = 3.14159265;
const float TAU = 6.28318530;
const vec2 BLOCK_SIZE = vec2(4.4, 5.2);
const float HIGHWAY_HALF_W = 5.4;

// --- Sine-free float32-safe hashes (long-running screensaver precision) ---
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
    return fract((p3.xx + p3.yz) * p3.zy);
}

float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash12(mod(i, 256.0));
    float b = hash12(mod(i + vec2(1.0, 0.0), 256.0));
    float c = hash12(mod(i + vec2(0.0, 1.0), 256.0));
    float d = hash12(mod(i + vec2(1.0, 1.0), 256.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm2(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 3; ++i) {
        v += a * valueNoise(p);
        p = p * 2.03 + vec2(17.1, 31.7);
        a *= 0.5;
    }
    return v;
}

// Saturation-preserving filmic tone mapping (keeps electric neon rich & vivid)
vec3 synthToneMap(vec3 x) {
    vec3 mapped = (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14);
    mapped = clamp(mapped, 0.0, 1.0);
    // Gentle vibrance lift so neon colors stay electric instead of pastel
    float lum = dot(mapped, vec3(0.2126, 0.7152, 0.0722));
    return clamp(mix(vec3(lum), mapped, 1.18), 0.0, 1.0);
}

// Exact ray-AABB intersection
bool intersectBox(vec3 ro, vec3 invRd, vec3 bMin, vec3 bMax, out float tNear, out vec3 hitNorm) {
    vec3 t0 = (bMin - ro) * invRd;
    vec3 t1 = (bMax - ro) * invRd;
    vec3 tSmall = min(t0, t1);
    vec3 tBig = max(t0, t1);
    float tn = max(max(tSmall.x, tSmall.y), tSmall.z);
    float tf = min(min(tBig.x, tBig.y), tBig.z);
    if (tf < max(tn, 0.0)) {
        tNear = 1e9;
        hitNorm = vec3(0.0, 1.0, 0.0);
        return false;
    }
    tNear = tn;
    vec3 s = -sign(invRd);
    if (tSmall.x >= tSmall.y && tSmall.x >= tSmall.z) {
        hitNorm = vec3(s.x, 0.0, 0.0);
    } else if (tSmall.y >= tSmall.z) {
        hitNorm = vec3(0.0, s.y, 0.0);
    } else {
        hitNorm = vec3(0.0, 0.0, s.z);
    }
    return true;
}

// Procedural skyscraper parameters for a grid cell
void getBuildingParams(vec2 cell, out bool hasBldg, out float hBase, out float hCrown, out float hSpire,
                       out vec2 halfFoot, out float styleHash) {
    vec2 wCell = mod(cell, 256.0);
    float centerX = (cell.x + 0.5) * BLOCK_SIZE.x;
    float absX = abs(centerX);

    // Wide central elevated hover-highway corridor
    if (absX < HIGHWAY_HALF_W + BLOCK_SIZE.x * 0.42) {
        hasBldg = false;
        hBase = 0.0; hCrown = 0.0; hSpire = 0.0;
        halfFoot = vec2(0.0); styleHash = 0.0;
        return;
    }

    // Periodic cross-street plaza gaps for realistic urban blocks
    float zMod = mod(cell.y, 9.0);
    if (zMod < 0.5 && hash12(wCell + vec2(3.7, 9.1)) > 0.45) {
        hasBldg = false;
        hBase = 0.0; hCrown = 0.0; hSpire = 0.0;
        halfFoot = vec2(0.0); styleHash = 0.0;
        return;
    }

    hasBldg = true;
    vec2 r = hash22(wCell + vec2(11.3, 29.7));
    styleHash = hash12(wCell + vec2(71.2, 13.9));

    // Inner towers frame the avenue; outer rows soar into supertall cyberpunk spires
    float rowDist = absX - HIGHWAY_HALF_W;
    float skylineProfile = mix(0.64, 1.42, smoothstep(2.0, 22.0, rowDist));
    float tallBoost = step(0.72, r.x) * (5.0 + 9.0 * r.y);

    // Audio-reactive 3D Equalizer modulation
    float eqMod = 0.0;
    if (rowDist < 8.5) {
        eqMod = u_bass * (2.6 + 2.4 * r.x);
    } else if (rowDist < 18.0) {
        eqMod = u_mids * (3.0 + 2.5 * r.y);
    } else {
        eqMod = u_treble * (2.8 + 2.2 * styleHash);
    }

    hBase = (5.5 + r.x * 13.5 + tallBoost) * skylineProfile + eqMod;

    bool hasCrown = (r.y > 0.42);
    hCrown = hasCrown ? (hBase + 2.2 + styleHash * 5.2 * skylineProfile) : hBase;

    bool hasSpire = (hCrown > 13.0 && fract(styleHash * 7.31) > 0.55);
    hSpire = hasSpire ? (hCrown + 2.6 + r.x * 4.8) : hCrown;

    halfFoot = BLOCK_SIZE * vec2(0.35 + 0.09 * r.x, 0.34 + 0.10 * r.y);
}

// Compute deep midnight synthwave sky, vivid graduated sun, wireframe mountains & storm clouds
vec3 evalSky(vec3 rd, vec3 sunDir, float timeWrap) {
    float h = clamp(rd.y, 0.0, 1.0);

    // Deep, high-contrast midnight sky gradient
    vec3 zenithCol = u_color_sky.rgb * 0.12 + vec3(0.006, 0.005, 0.014);
    vec3 midSkyCol = u_color_sky.rgb * 0.58;
    vec3 horizonGlow = mix(u_color_neon2.rgb, u_color_grid.rgb, 0.45) * 0.42 + u_color_sky.rgb * 0.25;

    vec3 sky = mix(horizonGlow, midSkyCol, smoothstep(0.0, 0.22, h));
    sky = mix(sky, zenithCol, smoothstep(0.18, 0.65, h));

    // Crisp high-altitude starfield
    if (rd.y > 0.12) {
        vec2 starUV = vec2(atan(rd.x, -rd.z) * 48.0, rd.y * 105.0);
        vec2 sId = floor(starUV);
        vec2 sF = fract(starUV) - 0.5;
        float sRand = hash12(mod(sId, 256.0));
        if (sRand > 0.962) {
            float twinkle = 0.60 + 0.40 * sin(timeWrap * 2.8 + sRand * TAU * 13.0);
            float star = smoothstep(0.16, 0.02, length(sF)) * smoothstep(0.12, 0.38, rd.y);
            sky += mix(vec3(0.85, 0.92, 1.0), u_color_neon1.rgb, 0.25) * star * twinkle * 1.1;
        }
    }

    // Subtle dramatic storm clouds lit from underneath by city neon
    if (rd.y > 0.04) {
        vec2 cloudUV = rd.xz / (rd.y + 0.18) * 0.52 + vec2(timeWrap * 0.012, -timeWrap * 0.020);
        float cNoise = fbm2(cloudUV * 2.5);
        float cloudMask = smoothstep(0.50, 0.82, cNoise) * smoothstep(0.04, 0.18, rd.y) * smoothstep(0.70, 0.25, rd.y);
        vec3 cloudLit = mix(u_color_sky.rgb * 0.28, u_color_neon2.rgb * 0.38 + u_color_neon1.rgb * 0.18, 0.42);
        sky = mix(sky, cloudLit, cloudMask * 0.48);
    }

    // Iconic Vivid Graduated-Slat Synthwave Sun
    vec2 sunDelta = vec2(rd.x - sunDir.x, rd.y - sunDir.y);
    float sunR = 0.162;
    float sunDist = length(sunDelta);

    // Rich sunset corona glow (controlled so it doesn't wash out the slats)
    float outerCorona = exp(-sunDist * 4.8) * 0.42;
    float innerRim = exp(-abs(sunDist - sunR) * 24.0) * 0.30;
    vec3 sunTopCol = mix(vec3(1.0, 0.72, 0.14), u_color_neon2.rgb + vec3(0.32, 0.18, 0.0), 0.25);
    vec3 sunMidCol = mix(u_color_neon2.rgb * 1.15, vec3(1.0, 0.22, 0.42), 0.40);
    vec3 sunBotCol = mix(u_color_grid.rgb * 1.10, u_color_neon2.rgb * 0.90, 0.55);

    sky += mix(sunMidCol, sunTopCol, 0.45) * (outerCorona + innerRim) * smoothstep(-0.04, 0.04, rd.y);

    if (sunDist < sunR + 0.01 && rd.y > -0.01) {
        float tNorm = clamp((sunDelta.y + sunR) / (2.0 * sunR), 0.0, 1.0);
        vec3 discCol = mix(sunBotCol, sunMidCol, smoothstep(0.0, 0.46, tNorm));
        discCol = mix(discCol, sunTopCol, smoothstep(0.40, 0.98, tNorm));

        // Authentic graduated Outrun horizontal slats that cut cleanly to the dark horizon
        float slatMask = 1.0;
        if (tNorm < 0.56) {
            float bandPos = fract(tNorm * 10.5);
            float gapWidth = mix(0.58, 0.06, clamp(tNorm / 0.56, 0.0, 1.0));
            slatMask = smoothstep(gapWidth - 0.035, gapWidth + 0.035, bandPos);
        }
        float edge = smoothstep(sunR + 0.005, sunR - 0.005, sunDist);
        vec3 gapSky = mix(u_color_sky.rgb * 0.32, sunBotCol * 0.22, 0.40);
        sky = mix(sky, mix(gapSky, discCol * 1.24, slatMask), edge);
    }

    // Dramatic Geometric Wireframe Mountain Range rising smoothly out of horizon mist
    if (rd.y >= -0.005 && rd.y < 0.14) {
        float ax = abs(rd.x - sunDir.x);
        float peakL = max(0.0, 0.115 - abs(rd.x + 0.16) * 0.58);
        float peakR = max(0.0, 0.112 - abs(rd.x - 0.17) * 0.56);
        float peakMid = max(0.0, 0.055 - abs(rd.x - 0.01) * 0.45) * smoothstep(0.01, 0.10, ax);
        float jag = 0.014 * abs(sin(rd.x * 26.0 + 0.7)) + 0.007 * sin(rd.x * 54.0);
        float mtnH = max(max(peakL, peakR), peakMid) + jag * smoothstep(0.0, 0.08, ax);

        if (rd.y < mtnH && mtnH > 0.012) {
            float diag1 = abs(fract((rd.x * 20.0 + rd.y * 30.0)) - 0.5);
            float diag2 = abs(fract((rd.x * 20.0 - rd.y * 30.0)) - 0.5);
            float wire = max(smoothstep(0.052, 0.012, diag1), smoothstep(0.052, 0.012, diag2));
            float ridgeRim = smoothstep(0.0055, 0.0, mtnH - rd.y);
            vec3 mtnBody = u_color_sky.rgb * 0.14 + vec3(0.01, 0.008, 0.02);
            vec3 mtnGlow = u_color_grid.rgb * (wire * 0.42 + ridgeRim * 1.35) + u_color_neon2.rgb * ridgeRim * 0.45;
            // Dissolve mountain base smoothly into horizon smog so there is no hard shelf at rd.y = 0
            vec3 mistBase = mix(u_color_sky.rgb * 0.34, mix(u_color_neon2.rgb, u_color_grid.rgb, 0.42) * 0.34, 0.46)
                          + mix(u_color_neon2.rgb, vec3(1.0, 0.78, 0.40), 0.35) * pow(max(dot(rd, sunDir), 0.0), 7.0) * 0.38;
            float baseFade = smoothstep(0.002, 0.038, rd.y);
            vec3 mtnCol = mix(mistBase, mtnBody + mtnGlow, baseFade);
            sky = mix(sky, mtnCol, 0.94);
        }
    }

    return sky;
}

// Shade a skyscraper facade, rooftop, or spire with high-contrast cyberpunk lighting & holo-billboards
vec3 shadeBuilding(vec3 hitPos, vec3 norm, vec2 cell, float hBase, float hCrown, float hSpire,
                   vec2 halfFoot, float styleHash, float tDist, vec3 rd, vec3 sunDir, float timeWrap) {
    vec2 wCell = mod(cell, 256.0);
    vec2 cellCenter = (cell + 0.5) * BLOCK_SIZE;
    vec2 localXZ = hitPos.xz - cellCenter;

    // Deep dark smoked-glass & brushed obsidian facade (high contrast for glowing neon!)
    vec3 baseMat = mix(vec3(0.010, 0.012, 0.022), u_color_sky.rgb * 0.11, 0.50);

    // Street-canyon ambient occlusion
    float heightAO = smoothstep(0.0, 9.0, hitPos.y) * 0.65 + 0.35;
    float avenueFacing = smoothstep(HIGHWAY_HALF_W + 6.0, HIGHWAY_HALF_W, abs(hitPos.x));

    // Directional sunset rim light
    float nDotSun = max(dot(norm, sunDir), 0.0);
    vec3 rimLight = mix(u_color_neon2.rgb, vec3(1.0, 0.78, 0.45), 0.35) * nDotSun * 0.24;

    // Upward neon bounce light from the glowing expressway
    float roadBounce = exp(-hitPos.y * 0.16) * (0.40 + 0.60 * avenueFacing);
    vec3 bounceCol = mix(u_color_grid.rgb, u_color_neon1.rgb, 0.45) * roadBounce * 0.28;

    // Grazing glass Fresnel reflection
    float fresnel = pow(1.0 - max(dot(norm, -rd), 0.0), 3.8);
    vec3 reflCol = mix(u_color_sky.rgb * 0.38, mix(u_color_neon1.rgb, u_color_neon2.rgb, styleHash), 0.45);
    vec3 col = baseMat * heightAO + rimLight + bounceCol + reflCol * fresnel * 0.38;

    // Rooftop shading
    if (norm.y > 0.5) {
        vec2 edgeDist = abs(halfFoot - abs(localXZ));
        float minEdge = min(edgeDist.x, edgeDist.y);
        float parapet = smoothstep(0.18, 0.03, minEdge);
        vec3 trimCol = mix(u_color_neon1.rgb, u_color_neon2.rgb, step(0.5, styleHash));
        col += trimCol * parapet * (0.95 + 0.50 * u_bass);

        vec2 roofG = abs(fract(localXZ * 1.4) - 0.5);
        float roofLines = smoothstep(0.05, 0.01, min(roofG.x, roofG.y)) * 0.10;
        col += u_color_sky.rgb * roofLines;

        if (hitPos.y > hCrown - 0.15 && hSpire > hCrown + 0.5) {
            float strobe = pow(0.5 + 0.5 * sin(timeWrap * 2.6 + styleHash * TAU), 10.0);
            col += vec3(1.0, 0.12, 0.08) * strobe * (1.8 + u_bass * 2.4);
        }
        return col;
    }

    // Spire / antenna needle
    if (hitPos.y > hCrown + 0.05) {
        float spireTop = smoothstep(hSpire - 0.9, hSpire, hitPos.y);
        float strobe = pow(0.5 + 0.5 * sin(timeWrap * 2.8 + styleHash * TAU), 8.0);
        col += vec3(1.0, 0.14, 0.08) * spireTop * (1.2 + strobe * (2.4 + u_bass * 2.5));
        return col;
    }

    // --- Per-Face Architectural Window Matrix (Anti-Aliased) ---
    float faceU = (abs(norm.x) > 0.5) ? localXZ.y : localXZ.x;
    float faceV = hitPos.y;
    float faceHalfW = (abs(norm.x) > 0.5) ? halfFoot.y : halfFoot.x;
    if (hitPos.y > hBase + 0.01) {
        faceHalfW *= 0.62;
    }

    float marginU = smoothstep(faceHalfW - 0.08, faceHalfW - 0.24, abs(faceU));
    float marginBot = smoothstep(0.45, 0.85, faceV);
    float activeTop = (hitPos.y > hBase + 0.01) ? hCrown : hBase;
    float marginTop = smoothstep(activeTop - 0.15, activeTop - 0.45, faceV);
    float winMask = marginU * marginBot * marginTop;

    float aa = clamp(tDist * 0.0055, 0.025, 0.26);

    int style = int(floor(styleHash * 4.0));
    float winEmit = 0.0;
    vec3 winTint = u_color_neon1.rgb;

    if (style == 0) {
        vec2 gScale = vec2(2.6, 1.85);
        vec2 gCoord = vec2(faceU, faceV) * gScale;
        vec2 gId = floor(gCoord);
        vec2 gF = fract(gCoord);
        float paneX = smoothstep(0.16 - aa, 0.16 + aa, gF.x) * smoothstep(0.16 - aa, 0.16 + aa, 1.0 - gF.x);
        float paneY = smoothstep(0.22 - aa, 0.22 + aa, gF.y) * smoothstep(0.22 - aa, 0.22 + aa, 1.0 - gF.y);
        float cellR = hash12(mod(gId + wCell * 13.7, 256.0));
        float floorR = hash11(gId.y + styleHash * 37.0);
        float lit = step(0.46, cellR * 0.72 + floorR * 0.45);
        float roomGrad = 0.65 + 0.35 * gF.y;
        winEmit = paneX * paneY * lit * roomGrad;
        vec3 warmRoom = vec3(1.0, 0.82, 0.52);
        vec3 neonRoom = mix(u_color_neon1.rgb, u_color_neon2.rgb, step(0.58, fract(cellR * 9.7)));
        winTint = mix(warmRoom, neonRoom, smoothstep(0.28, 0.72, fract(cellR * 5.3)));
    } else if (style == 1) {
        vec2 gScale = vec2(1.4, 1.65);
        vec2 gCoord = vec2(faceU, faceV) * gScale;
        vec2 gId = floor(gCoord);
        vec2 gF = fract(gCoord);
        float bandY = smoothstep(0.28 - aa, 0.28 + aa, gF.y) * smoothstep(0.28 - aa, 0.28 + aa, 1.0 - gF.y);
        float mullionX = smoothstep(0.05 - aa * 0.5, 0.05 + aa * 0.5, abs(gF.x - 0.5));
        float floorR = hash11(gId.y + styleHash * 53.0);
        float lit = smoothstep(0.40, 0.74, floorR);
        winEmit = bandY * (0.4 + 0.6 * mullionX) * lit;
        winTint = mix(u_color_neon1.rgb, vec3(0.95, 0.90, 0.80), 0.30);
    } else if (style == 2) {
        vec2 gScale = vec2(3.2, 1.3);
        vec2 gCoord = vec2(faceU, faceV) * gScale;
        vec2 gId = floor(gCoord);
        vec2 gF = fract(gCoord);
        float ribX = smoothstep(0.24 - aa, 0.24 + aa, gF.x) * smoothstep(0.24 - aa, 0.24 + aa, 1.0 - gF.x);
        float segY = smoothstep(0.14 - aa, 0.14 + aa, gF.y) * smoothstep(0.14 - aa, 0.14 + aa, 1.0 - gF.y);
        float cellR = hash12(mod(gId + wCell * 7.3, 256.0));
        float lit = step(0.54, cellR);
        winEmit = ribX * segY * lit * 0.92;
        winTint = mix(u_color_neon2.rgb, u_color_neon1.rgb, step(0.5, fract(cellR * 11.1)));
    } else {
        vec2 gScale = vec2(3.4, 2.2);
        vec2 gCoord = vec2(faceU, faceV) * gScale;
        vec2 gId = floor(gCoord);
        vec2 gF = fract(gCoord);
        float paneX = smoothstep(0.18 - aa, 0.18 + aa, gF.x) * smoothstep(0.18 - aa, 0.18 + aa, 1.0 - gF.x);
        float paneY = smoothstep(0.24 - aa, 0.24 + aa, gF.y) * smoothstep(0.24 - aa, 0.24 + aa, 1.0 - gF.y);
        float cellR = hash12(mod(gId + wCell * 19.1, 256.0));
        float lit = step(0.52, cellR);
        winEmit = paneX * paneY * lit;
        winTint = mix(vec3(1.0, 0.80, 0.48), u_color_neon2.rgb, step(0.62, fract(cellR * 6.7)));
    }

    float shimmer = 1.0 + 0.18 * u_treble * sin(timeWrap * 4.5 + floor(faceV * 2.0) * 1.7 + styleHash * TAU);
    float distFade = exp(-tDist * 0.007);
    col += winTint * winEmit * winMask * shimmer * 1.45 * (0.45 + 0.55 * distFade);

    // Keystroke Window Overdrive
    if (u_keystroke_energy > 0.02) {
        float wave = pow(0.5 + 0.5 * sin(faceV * 2.2 - timeWrap * 14.0 + styleHash * TAU), 4.0);
        col += mix(u_color_neon1.rgb, vec3(1.0), 0.35) * wave * winMask * u_keystroke_energy * 1.5;
    }

    // Crisp Architectural Neon Trim (cornice & vertical corner light strips)
    vec3 trimColor = mix(u_color_neon1.rgb, u_color_neon2.rgb, step(0.48, styleHash));
    float cornice = smoothstep(0.16, 0.02, abs(faceV - (activeTop - 0.18)));
    float midBand = (hBase > 10.0) ? smoothstep(0.12, 0.02, abs(faceV - hBase * 0.55)) * step(0.45, fract(styleHash * 3.7)) : 0.0;
    float cornerRib = smoothstep(0.11, 0.015, abs(abs(faceU) - (faceHalfW - 0.06))) * step(0.52, fract(styleHash * 5.1));
    col += trimColor * (cornice * 1.55 + midBand * 0.85 + cornerRib * 0.80) * (0.85 + 0.35 * u_bass);

    // --- Sleek Cyberpunk Holographic Billboards (Emblems, EQ Bars, Scanlines & Glow Spill) ---
    bool facingAvenue = (abs(norm.x) > 0.5 && sign(norm.x) == -sign(cellCenter.x) && abs(cellCenter.x) < HIGHWAY_HALF_W + BLOCK_SIZE.x * 1.35);
    if (facingAvenue && styleHash > 0.54 && hBase > 8.5) {
        float bCenterY = clamp(hBase * 0.52, 4.8, 10.5);
        bool tallSign = (fract(styleHash * 13.7) > 0.5);
        float bHalfH = tallSign ? 2.4 : 1.35;
        float bHalfW = tallSign ? (faceHalfW * 0.42) : (faceHalfW * 0.78);
        vec2 bUV = vec2(faceU / max(bHalfW, 0.1), (faceV - bCenterY) / bHalfH);
        vec3 holoCol = mix(u_color_neon2.rgb, u_color_neon1.rgb, step(0.76, styleHash));
        vec3 holoAcc = mix(u_color_neon1.rgb, u_color_neon2.rgb, step(0.76, styleHash));

        // Soft neon halo spill onto the building wall around the billboard
        vec2 spillD = max(abs(bUV) - vec2(1.0), vec2(0.0));
        float spill = exp(-length(spillD) * 4.5) * 0.35;
        col += holoCol * spill;

        if (abs(bUV.x) < 1.0 && abs(bUV.y) < 1.0) {
            vec2 bN = bUV * 0.5 + 0.5;
            float scan = 0.80 + 0.20 * sin(bN.y * 58.0 - timeWrap * (1.4 + u_mids * 6.0));

            // Glowing holo screen backing gradient
            vec3 screenBg = mix(holoCol * 0.28, holoAcc * 0.14, bN.y) * scan;

            // Crisp outer neon frame + bright corner brackets
            float bdX = min(bN.x, 1.0 - bN.x);
            float bdY = min(bN.y, 1.0 - bN.y);
            float border = smoothstep(0.055, 0.015, min(bdX, bdY));
            float corner = smoothstep(0.09, 0.02, min(bdX, bdY)) * step(0.68, max(abs(bUV.x), abs(bUV.y)));

            // Futuristic graphic content: emblem / audio-reactive EQ bars / typographic strips
            float gfx = 0.0;
            if (tallSign) {
                // Vertical Neo-Tokyo neon blade sign: glowing circular emblem at top + bold vertical text bars
                float ringR = length(vec2(bUV.x, (bUV.y - 0.52) * 1.8));
                float emblem = smoothstep(0.08, 0.015, abs(ringR - 0.42)) + smoothstep(0.16, 0.04, ringR) * 0.8;
                float barBand = step(-0.78, bUV.y) * step(bUV.y, 0.18);
                float rowId = floor((bUV.y + 0.8) * 6.0);
                float rowF = fract((bUV.y + 0.8) * 6.0);
                float barW = 0.30 + 0.45 * hash11(rowId + styleHash * 23.0);
                float barShape = smoothstep(barW + 0.05, barW - 0.05, abs(bUV.x)) *
                                 smoothstep(0.18, 0.28, rowF) * smoothstep(0.18, 0.28, 1.0 - rowF);
                gfx = max(emblem, barBand * barShape);
            } else {
                // Wide corporate holo-display: live audio equalizer bars + header ticker
                float header = smoothstep(0.55, 0.62, bUV.y) * smoothstep(0.84, 0.78, bUV.y) *
                               smoothstep(0.85, 0.75, abs(bUV.x));
                float eqZone = step(-0.72, bUV.y) * step(bUV.y, 0.42) * step(abs(bUV.x), 0.82);
                float barCol = floor((bUV.x + 0.85) * 6.5);
                float barXF = fract((bUV.x + 0.85) * 6.5);
                float idleWave = 0.5 + 0.5 * sin(timeWrap * 1.1 + barCol * 1.3 + styleHash * TAU);
                float audioWave = 0.5 + 0.5 * sin(timeWrap * 5.5 + barCol * 1.9 + styleHash * TAU);
                float barAmp = 0.22 + 0.24 * idleWave + 0.48 * clamp(u_mids + u_bass * 0.5, 0.0, 1.0) * audioWave;
                float barH = -0.72 + barAmp * 1.08;
                float eqBar = step(bUV.y, barH) * smoothstep(0.15, 0.25, barXF) * smoothstep(0.15, 0.25, 1.0 - barXF);
                gfx = max(header * 0.85, eqZone * eqBar);
            }

            col = mix(col, screenBg, 0.88);
            col += holoCol * (border * 1.35 + corner * 1.1) + mix(holoCol, vec3(1.0), 0.35) * gfx * scan * 1.55;
        }
    }

    return col;
}

// Analytical 3D Multi-Altitude Flying Hovercraft Light Streams (twin headlight/taillight trails)
vec3 evalHovercraftStreams(vec3 ro, vec3 rd, float maxT, float timeWrap) {
    vec3 glow = vec3(0.0);

    for (int layer = 0; layer < 4; ++layer) {
        float fl = float(layer);
        float planeY = (layer == 0) ? 0.55 : (layer == 1) ? 2.8 : (layer == 2) ? 6.8 : 11.2;
        if (abs(rd.y) < 0.001) continue;
        float tP = (planeY - ro.y) / rd.y;
        if (tP <= 0.5 || tP >= maxT) continue;

        vec3 p = ro + rd * tP;
        if (abs(p.x) > HIGHWAY_HALF_W - 0.35) continue;

        float laneOffset = 1.65 + 0.95 * mod(fl, 2.0);
        float speed = (6.0 + fl * 2.2) * (1.0 + u_mids * 1.15);

        // Left lane (receding -> -Z, twin magenta/crimson taillight trails)
        float dL = abs(p.x + laneOffset);
        if (dL < 0.55) {
            float zCoord = -p.z * 0.10 - timeWrap * (speed * 0.10) + fl * 1.73;
            float carId = floor(zCoord);
            float carF = fract(zCoord);
            float isCar = step(0.42, hash11(mod(carId, 256.0) + fl * 17.3));
            float trail = pow(carF, 6.0) * smoothstep(1.0, 0.93, carF);
            // Twin light ribbons spaced 0.18 units apart
            float twin = max(smoothstep(0.09, 0.015, abs(dL - 0.11)), smoothstep(0.09, 0.015, abs(dL + 0.11)));
            float halo = smoothstep(0.50, 0.04, dL) * 0.42;
            float distFade = exp(-tP * 0.013);
            glow += u_color_neon2.rgb * isCar * trail * (twin * 2.6 + halo) * distFade;
            glow += vec3(1.0, 0.85, 0.92) * isCar * pow(carF, 22.0) * smoothstep(0.99, 0.94, carF) * twin * 2.4 * distFade;
        }

        // Right lane (oncoming -> +Z, twin cyan headlight trails)
        float dR = abs(p.x - laneOffset);
        if (dR < 0.55) {
            float zCoord = p.z * 0.10 - timeWrap * (speed * 0.115) + fl * 3.19;
            float carId = floor(zCoord);
            float carF = fract(zCoord);
            float isCar = step(0.40, hash11(mod(carId, 256.0) + fl * 29.1));
            float trail = pow(carF, 6.0) * smoothstep(1.0, 0.93, carF);
            float twin = max(smoothstep(0.09, 0.015, abs(dR - 0.11)), smoothstep(0.09, 0.015, abs(dR + 0.11)));
            float halo = smoothstep(0.50, 0.04, dR) * 0.42;
            float distFade = exp(-tP * 0.013);
            glow += u_color_neon1.rgb * isCar * trail * (twin * 2.6 + halo) * distFade;
            glow += vec3(0.90, 0.98, 1.0) * isCar * pow(carF, 22.0) * smoothstep(0.99, 0.94, carF) * twin * 2.4 * distFade;
        }
    }

    // Keystroke supersonic afterburner streak
    if (u_keystroke_energy > 0.02 && abs(rd.y) > 0.001) {
        float tK = (1.15 - ro.y) / rd.y;
        if (tK > 0.5 && tK < maxT) {
            vec3 pk = ro + rd * tK;
            float kLane = (u_keystroke_pos.x - 0.5) * 7.0;
            float dK = abs(pk.x - kLane);
            if (dK < 0.65) {
                float kz = fract(-pk.z * 0.08 - timeWrap * 3.8);
                float streak = pow(kz, 4.0) * smoothstep(0.55, 0.02, dK) * u_keystroke_energy;
                glow += mix(u_color_neon1.rgb, vec3(1.0), 0.55) * streak * 3.5 * exp(-tK * 0.015);
            }
        }
    }

    return glow;
}

void main() {
    vec2 uv = qt_TexCoord0;
    float timeWrap = mod(u_time, 1024.0);

    // Keystroke EMP / Backspace Glitch Voltage Sag
    float empGlitch = 0.0;
    if (u_vortex_speed < 0.0) {
        empGlitch = clamp(-u_vortex_speed * 0.5, 0.0, 1.0);
        uv.x += sin(uv.y * 120.0 + timeWrap * 40.0) * 0.014 * empGlitch;
    }

    // Auth Failed Security Lockdown CRT Glitch
    if (u_shockwave_intensity > 0.01) {
        float tear = step(0.92, sin(uv.y * 60.0 + timeWrap * 25.0));
        uv.x += (hash12(vec2(floor(uv.y * 30.0), floor(timeWrap * 18.0))) - 0.5) * 0.045 * u_shockwave_intensity * tear;
    }

    // Subtle refractive lens condensation droplets
    vec2 lensOffset = vec2(0.0);
    float dropletSpec = 0.0;
    if (u_rain_density > 0.15) {
        float aspectTmp = u_resolution.x / max(u_resolution.y, 1.0);
        vec2 dUV = uv * vec2(15.0 * aspectTmp, 9.5);
        float dropFlow = mod(timeWrap * 0.20, 256.0);
        vec2 dId = floor(vec2(dUV.x, dUV.y - dropFlow));
        vec2 dF = fract(vec2(dUV.x, dUV.y - dropFlow)) - 0.5;
        float dRand = hash12(mod(dId, 256.0));
        if (dRand > 0.92) {
            vec2 jitter = (hash22(mod(dId + 17.3, 256.0)) - 0.5) * 0.45;
            vec2 rel = dF - jitter;
            float r = length(rel * vec2(1.0, 0.72));
            if (r < 0.13) {
                float mask = smoothstep(0.13, 0.04, r) * clamp(u_rain_density, 0.0, 1.0);
                lensOffset = rel * mask * 0.04;
                dropletSpec = smoothstep(0.10, 0.025, length(rel - vec2(-0.025, -0.035))) * mask * 0.22;
            }
        }
    }
    vec2 sampleUV = clamp(uv + lensOffset, 0.001, 0.999);

    float aspect = u_resolution.x / max(u_resolution.y, 1.0);
    vec2 p = vec2(sampleUV.x - 0.5, 0.5 - sampleUV.y) * vec2(aspect, 1.0);

    // ------------------------------------------------------------------------
    // 1. Elevated Hover-Highway Camera Setup (Monotonic Smooth Cruise)
    // ------------------------------------------------------------------------
    float zPeriod = BLOCK_SIZE.y * 128.0;
    float zTravel = mod(u_grid_scroll, zPeriod);

    vec3 ro = vec3(0.0, 6.2, -zTravel);
    ro.x += (u_pointer.x - 0.5) * 2.6 + u_ambient_drift.x * 0.35;
    ro.y += sin(mod(timeWrap * 0.28, TAU)) * 0.06;

    if (u_vortex_speed > 2.0) {
        float launchBoost = u_vortex_speed - 2.0;
        ro.y += launchBoost * 18.0;
    }

    float yaw = (u_pointer.x - 0.5) * 0.28 + u_camera_tilt.x;
    float pitch = -(u_pointer.y - 0.5) * 0.22 - 0.055 + u_camera_tilt.y;
    if (u_vortex_speed > 2.0) {
        pitch += min(1.15, (u_vortex_speed - 2.0) * 0.85);
    }

    vec3 forward = normalize(vec3(sin(yaw), pitch, -cos(yaw)));
    vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
    vec3 up = cross(right, forward);
    vec3 rd = normalize(forward * 1.15 + p.x * right + p.y * up);

    vec3 sunDir = normalize(vec3(0.0, 0.145, -1.0));

    // ------------------------------------------------------------------------
    // 2. Exact 2D DDA City Traversal + Unclamped Analytical Ground Plane
    // ------------------------------------------------------------------------
    float tBldgMax = 210.0;
    float tGround = (rd.y < -0.0001) ? (-ro.y / rd.y) : 1e9;
    // Never leave a horizon gap below rd.y = 0: ground extends seamlessly to infinity
    float tBest = (rd.y < -0.0001) ? tGround : tBldgMax;
    int hitType = (rd.y < -0.0001) ? 2 : 0; // 0 = sky, 1 = building, 2 = ground
    vec3 hitNorm = vec3(0.0, 1.0, 0.0);
    vec2 hitCell = vec2(0.0);
    float hitHBase = 0.0, hitHCrown = 0.0, hitHSpire = 0.0;
    vec2 hitHalfFoot = vec2(0.0);
    float hitStyle = 0.0;

    vec2 rayPosXZ = ro.xz / BLOCK_SIZE;
    vec2 rayDirXZ = rd.xz / BLOCK_SIZE;
    vec2 mapCell = floor(rayPosXZ);
    vec2 stepDir = sign(rayDirXZ);
    vec2 invRayDirXZ = vec2(
        abs(rayDirXZ.x) > 1e-6 ? 1.0 / abs(rayDirXZ.x) : 1e9,
        abs(rayDirXZ.y) > 1e-6 ? 1.0 / abs(rayDirXZ.y) : 1e9
    );
    vec2 sideDist = (stepDir * (mapCell - rayPosXZ) + (stepDir * 0.5 + 0.5)) * invRayDirXZ;
    vec3 invRd = 1.0 / (rd + vec3(
        abs(rd.x) < 1e-6 ? 1e-6 : 0.0,
        abs(rd.y) < 1e-6 ? 1e-6 : 0.0,
        abs(rd.z) < 1e-6 ? 1e-6 : 0.0
    ));

    float tCell = 0.0;
    float tSearchLimit = min(tBest, tBldgMax);
    for (int i = 0; i < 52; ++i) {
        if (tCell > tSearchLimit) break;
        if (rd.y > 0.0 && (ro.y + rd.y * tCell) > 48.0) break;

        bool hasBldg;
        float hBase, hCrown, hSpire, styleHash;
        vec2 halfFoot;
        getBuildingParams(mapCell, hasBldg, hBase, hCrown, hSpire, halfFoot, styleHash);

        if (hasBldg) {
            vec2 cCenter = (mapCell + 0.5) * BLOCK_SIZE;
            float tHit;
            vec3 nHit;

            vec3 bMin = vec3(cCenter.x - halfFoot.x, 0.0, cCenter.y - halfFoot.y);
            vec3 bMax = vec3(cCenter.x + halfFoot.x, hBase, cCenter.y + halfFoot.y);
            if (intersectBox(ro, invRd, bMin, bMax, tHit, nHit) && tHit > 0.05 && tHit < tBest) {
                tBest = tHit;
                tSearchLimit = min(tBest, tBldgMax);
                hitType = 1;
                hitNorm = nHit;
                hitCell = mapCell;
                hitHBase = hBase; hitHCrown = hCrown; hitHSpire = hSpire;
                hitHalfFoot = halfFoot; hitStyle = styleHash;
            }

            if (hCrown > hBase + 0.1) {
                vec2 crownFoot = halfFoot * 0.62;
                vec3 cMin = vec3(cCenter.x - crownFoot.x, hBase, cCenter.y - crownFoot.y);
                vec3 cMax = vec3(cCenter.x + crownFoot.x, hCrown, cCenter.y + crownFoot.y);
                if (intersectBox(ro, invRd, cMin, cMax, tHit, nHit) && tHit > 0.05 && tHit < tBest) {
                    tBest = tHit;
                    tSearchLimit = min(tBest, tBldgMax);
                    hitType = 1;
                    hitNorm = nHit;
                    hitCell = mapCell;
                    hitHBase = hBase; hitHCrown = hCrown; hitHSpire = hSpire;
                    hitHalfFoot = halfFoot; hitStyle = styleHash;
                }
            }

            if (hSpire > hCrown + 0.1) {
                vec3 sMin = vec3(cCenter.x - 0.12, hCrown, cCenter.y - 0.12);
                vec3 sMax = vec3(cCenter.x + 0.12, hSpire, cCenter.y + 0.12);
                if (intersectBox(ro, invRd, sMin, sMax, tHit, nHit) && tHit > 0.05 && tHit < tBest) {
                    tBest = tHit;
                    tSearchLimit = min(tBest, tBldgMax);
                    hitType = 1;
                    hitNorm = nHit;
                    hitCell = mapCell;
                    hitHBase = hBase; hitHCrown = hCrown; hitHSpire = hSpire;
                    hitHalfFoot = halfFoot; hitStyle = styleHash;
                }
            }

            if (hitType == 1 && tBest <= min(sideDist.x, sideDist.y) + 0.01) {
                break;
            }
        }

        if (sideDist.x < sideDist.y) {
            tCell = sideDist.x;
            sideDist.x += invRayDirXZ.x;
            mapCell.x += stepDir.x;
        } else {
            tCell = sideDist.y;
            sideDist.y += invRayDirXZ.y;
            mapCell.y += stepDir.y;
        }
    }

    // ------------------------------------------------------------------------
    // 3. Sky & Surface Shading
    // ------------------------------------------------------------------------
    vec3 skyColor = evalSky(rd, sunDir, timeWrap);
    vec3 sceneColor = skyColor;

    if (hitType == 1) {
        vec3 hitPos = ro + rd * tBest;
        sceneColor = shadeBuilding(hitPos, hitNorm, hitCell, hitHBase, hitHCrown, hitHSpire,
                                   hitHalfFoot, hitStyle, tBest, rd, sunDir, timeWrap);
    } else if (hitType == 2) {
        // --- Rain-Slicked Elevated Neon Expressway & Seamless Reflections ---
        vec3 hitPos = ro + rd * tBest;
        vec2 roadXZ = hitPos.xz;
        float absX = abs(roadXZ.x);

        float puddleNoise = fbm2(roadXZ * vec2(0.32, 0.18));
        float wetness = smoothstep(0.28, 0.68, puddleNoise);
        float rainRipple = sin(roadXZ.x * 18.0 + roadXZ.y * 14.0 + timeWrap * 7.0) * 0.012 * u_rain_density * wetness;

        // Deep wet midnight asphalt
        vec3 asphalt = mix(vec3(0.008, 0.009, 0.018), u_color_sky.rgb * 0.07, 0.45);

        // Distance-antialiased Synthwave Perspective Grid
        float fwX = max(0.016, tBest * 0.0038);
        float fwZ = max(0.020, tBest * 0.0044);
        float gX = smoothstep(fwX, fwX * 0.18, abs(fract(roadXZ.x * 0.5 + 0.5) - 0.5));
        float gZ = smoothstep(fwZ, fwZ * 0.18, abs(fract(roadXZ.y * 0.25 + 0.5) - 0.5));
        float gridDistFade = exp(-tBest * 0.015);
        float roadGrid = max(gX, gZ) * gridDistFade;

        float onHighway = smoothstep(HIGHWAY_HALF_W + 0.3, HIGHWAY_HALF_W - 0.15, absX);
        float shoulder = smoothstep(0.22, 0.03, abs(absX - (HIGHWAY_HALF_W - 0.45))) * gridDistFade;
        float centerDash = smoothstep(0.075, 0.014, absX) * (0.50 + 0.50 * smoothstep(0.25, 0.75, fract(-roadXZ.y * 0.22)));
        float laneMarks = smoothstep(0.055, 0.012, abs(absX - 2.6)) * smoothstep(0.55, 0.80, fract(-roadXZ.y * 0.18)) * 0.45;

        // Shimmering rain-rippled reflection of the Synthwave Sun down the center highway
        vec3 reflRd = reflect(rd, normalize(vec3(rainRipple, 1.0, rainRipple * 0.6)));
        float sunReflX = abs(reflRd.x - sunDir.x);
        float sunSpecBroad = exp(-sunReflX * mix(10.0, 24.0, wetness)) * smoothstep(0.0, 0.26, reflRd.y) * exp(-reflRd.y * 5.0);
        float sunSpecCore = exp(-sunReflX * mix(30.0, 72.0, wetness)) * exp(-abs(reflRd.y - sunDir.y) * 9.5);
        vec3 sunReflCol = mix(u_color_neon2.rgb, vec3(1.0, 0.82, 0.42), 0.42) * (sunSpecBroad * 0.48 + sunSpecCore * 1.15);

        // Smooth, seamless wet neon reflections of flanking skyscrapers (zero block seams!)
        float sideProximity = smoothstep(0.6, HIGHWAY_HALF_W, absX);
        float smoothMix = fbm2(vec2(roadXZ.x * 0.14, roadXZ.y * 0.085));
        float streakShimmer = 0.55 + 0.45 * sin(roadXZ.y * 1.35 + smoothMix * TAU);
        vec3 sideNeon = mix(u_color_neon1.rgb, u_color_neon2.rgb, smoothstep(0.32, 0.68, smoothMix));
        vec3 bldgRefl = sideNeon * sideProximity * (0.24 + 0.46 * wetness) * streakShimmer * exp(-tBest * 0.012);

        float roadFresnel = pow(1.0 - max(-rd.y, 0.0), 3.4);
        vec3 skyRefl = mix(u_color_sky.rgb * 0.22, u_color_neon1.rgb * 0.18, 0.35) * roadFresnel * (0.30 + 0.50 * wetness);

        sceneColor = asphalt
                   + u_color_grid.rgb * roadGrid * (0.68 * onHighway + 0.22 * (1.0 - onHighway))
                   + u_color_neon1.rgb * shoulder * 1.35
                   + u_color_neon2.rgb * centerDash * 1.25 * gridDistFade
                   + u_color_neon1.rgb * laneMarks * gridDistFade
                   + (sunReflCol * onHighway + bldgRefl + skyRefl) * (0.65 + 0.45 * wetness);
    }

    // ------------------------------------------------------------------------
    // 4. Multi-Altitude Flying Hovercraft Streams (Occluded by Buildings)
    // ------------------------------------------------------------------------
    sceneColor += evalHovercraftStreams(ro, rd, tBest, timeWrap);

    // ------------------------------------------------------------------------
    // 5. Deep Volumetric Cyberpunk Smog & Horizon Atmosphere
    // ------------------------------------------------------------------------
    if (hitType != 0) {
        vec3 hitPos = ro + rd * tBest;
        float fogRate = 0.0068 + u_fog_density * 0.0085;
        float distFog = 1.0 - exp(-tBest * fogRate);
        float groundMist = exp(-max(hitPos.y, 0.0) * 0.18) * (1.0 - exp(-tBest * 0.022)) * 0.32 * u_fog_density;
        float totalFog = clamp(distFog + groundMist * (1.0 - distFog), 0.0, 0.96);

        // Deep saturated horizon mist (preserves cyberpunk midnight contrast!)
        vec3 horizonFogCol = mix(u_color_sky.rgb * 0.34,
                                 mix(u_color_neon2.rgb, u_color_grid.rgb, 0.42) * 0.34,
                                 0.46);
        float sunScatter = pow(max(dot(rd, sunDir), 0.0), 7.0);
        horizonFogCol += mix(u_color_neon2.rgb, vec3(1.0, 0.78, 0.40), 0.35) * sunScatter * 0.38;

        sceneColor = mix(sceneColor, horizonFogCol, totalFog);
    }

    // ------------------------------------------------------------------------
    // 6. Subtle Volumetric Drone Searchlight (Controlled, No Center Blowout)
    // ------------------------------------------------------------------------
    vec3 searchDir = normalize(forward * 1.15 + (u_pointer.x - 0.5) * right * 0.95 - (u_pointer.y - 0.5) * up * 0.75);
    float spotDot = max(dot(rd, searchDir), 0.0);
    float beamScatter = pow(spotDot, 32.0) * 0.09 * clamp(u_searchlight_power, 0.0, 2.2);
    float surfaceSpot = (hitType != 0) ? (smoothstep(0.978, 0.996, spotDot) * (9.0 / (tBest + 18.0)) * 0.28 * clamp(u_searchlight_power, 0.0, 2.2)) : 0.0;
    vec3 beamCol = mix(vec3(0.75, 0.92, 1.0), u_color_neon1.rgb, 0.35);
    sceneColor += beamCol * (beamScatter + surfaceSpot);

    // ------------------------------------------------------------------------
    // 7. Wind-Slanted Neon-Lit Rain Sheets & Lens Specular
    // ------------------------------------------------------------------------
    if (u_rain_density > 0.05) {
        vec2 rainUV1 = vec2(uv.x * aspect + uv.y * 0.13, uv.y);
        vec2 rCell1 = vec2(rainUV1.x * 135.0, rainUV1.y * 10.5 - mod(timeWrap * 11.5, 256.0));
        float rRand1 = hash12(mod(floor(rCell1), 256.0));
        float rMask1 = step(0.942 - 0.035 * u_rain_density, rRand1);
        float rStreakY1 = pow(fract(rCell1.y), 2.4) * smoothstep(1.0, 0.86, fract(rCell1.y));
        float rStreakX1 = smoothstep(0.22, 0.02, abs(fract(rCell1.x) - 0.5));
        float rain1 = rMask1 * rStreakY1 * rStreakX1;

        vec2 rainUV2 = vec2(uv.x * aspect + uv.y * 0.10, uv.y);
        vec2 rCell2 = vec2(rainUV2.x * 215.0 + 37.0, rainUV2.y * 16.5 - mod(timeWrap * 15.5, 256.0));
        float rRand2 = hash12(mod(floor(rCell2), 256.0));
        float rMask2 = step(0.955 - 0.025 * u_rain_density, rRand2);
        float rStreakY2 = pow(fract(rCell2.y), 2.6) * smoothstep(1.0, 0.86, fract(rCell2.y));
        float rStreakX2 = smoothstep(0.20, 0.02, abs(fract(rCell2.x) - 0.5));
        float rain2 = rMask2 * rStreakY2 * rStreakX2 * 0.50;

        vec3 rainTint = mix(vec3(0.68, 0.86, 1.0), mix(u_color_neon1.rgb, u_color_neon2.rgb, uv.x), 0.42);
        sceneColor += rainTint * (rain1 + rain2) * (0.34 + u_treble * 0.48) * u_rain_density;
        sceneColor += rainTint * dropletSpec;
    }

    // ------------------------------------------------------------------------
    // 8. Auth State Phenomena: Lockdown Sirens, EMP & Skyward Launch
    // ------------------------------------------------------------------------
    if (u_shockwave_intensity > 0.01) {
        float sirenAngle = timeWrap * 8.0;
        float sirenSweep = sin(atan(p.y, p.x) * 3.0 + sirenAngle) * 0.5 + 0.5;
        vec3 alarmRed = vec3(1.0, 0.06, 0.03);
        sceneColor = mix(sceneColor, alarmRed * (sceneColor * 1.4 + vec3(0.25)), u_shockwave_intensity * (0.35 + 0.55 * sirenSweep));
        sceneColor *= (0.88 + 0.12 * sin(uv.y * 360.0));
    }

    if (empGlitch > 0.01) {
        float flicker = 0.5 + 0.5 * sin(timeWrap * 85.0);
        float lum = dot(sceneColor, vec3(0.299, 0.587, 0.114));
        sceneColor = mix(sceneColor, vec3(lum) * 0.35, empGlitch * flicker);
    }

    if (u_vortex_speed > 2.0) {
        float warpSpeed = u_vortex_speed - 2.0;
        vec3 gridOverload = mix(vec3(0.1, 1.0, 0.45), vec3(1.0, 0.9, 0.25), sin(timeWrap * 8.0) * 0.5 + 0.5);
        sceneColor = mix(sceneColor, gridOverload * 1.6, clamp(warpSpeed * 0.45, 0.0, 0.85));
    }

    // ------------------------------------------------------------------------
    // 9. Saturation-Preserving Filmic Tone Mapping & Subtle Vignette
    // ------------------------------------------------------------------------
    sceneColor = synthToneMap(sceneColor * 1.15);
    float vig = 1.0 - dot((uv - 0.5) * vec2(1.15, 0.95), (uv - 0.5) * vec2(1.15, 0.95)) * 0.42;
    sceneColor *= clamp(vig, 0.62, 1.0);

    fragColor = vec4(sceneColor, 1.0) * qt_Opacity;
}
