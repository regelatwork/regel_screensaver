#version 440

layout(location = 0) in vec2 qt_TexCoord0;
layout(location = 0) out vec4 fragColor;

layout(std140, binding = 0) uniform buf {
    mat4 qt_Matrix;              // 0..63
    float qt_Opacity;            // 64..67
    vec2 u_resolution;           // 72..79 (aligned to 8, padded 68..71)
    vec2 u_pointer;              // 80..87
    vec2 u_pointer_vel;          // 88..95
    vec2 u_keystroke_pos;        // 96..103
    vec2 u_keystroke_dir;        // 104..111
    vec2 u_beat_center;          // 112..119
    vec2 u_ambient_drift;        // 120..127
    vec4 u_color_stone;          // 128..143 (Base stone / bas-relief slab)
    vec4 u_color_porcelain;      // 144..159 (Translucent milky porcelain)
    vec4 u_color_gold;           // 160..175 (Gilded metallic inlay & microflake glints)
    vec4 u_color_sheen;          // 176..191 (Iridescent thin-film interference tint)
    vec4 u_color_void;           // 192..207 (Background deep crevice / shadow)
    float u_time;                // 208..211
    float u_keystroke_energy;    // 212..215
    float u_shockwave_intensity; // 216..219
    float u_vortex_speed;        // 220..223
    float u_bass;                // 224..227
    float u_mids;                // 228..231
    float u_treble;              // 232..235
    float u_scroll_speed;        // 236..239
    float u_emboss_depth;        // 240..243
    float u_glitter_density;     // 244..247
    float u_iridescence_strength;// 248..251
    float u_holo_strength;       // 252..255 (CD / Holographic diffraction grating intensity)
    float u_glyph_spacing;       // 256..259 (Glyph grid spacing / density)
    float u_glyph_zoom;          // 260..263 (Overall field zoom scale)
    float u_holo_mode;           // 264..267 (Hologram sticker intensity / density)
    float u_film_regime;         // 268..271 (0.0 = thin high-IOR bismuth, 1.0 = thick pearlescent opal/nacre)
    vec2  u_quote_size;          // 272..279 (quote bounding half-width and half-height)
    vec2  u_glitter_scroll;      // 280..287 (64-bit wrapped skewed simplex scroll mod 4096.0)
    vec4  u_sticker0;            // 288..303 (Active sticker slot 0: cx, cy, intensity, active)
    vec4  u_sticker1;            // 304..319 (Active sticker slot 1)
    vec4  u_sticker2;            // 320..335 (Active sticker slot 2)
    vec4  u_sticker3;            // 336..351 (Active sticker slot 3)
    vec4  u_sticker4;            // 352..367 (Active sticker slot 4)
    vec4  u_sticker5;            // 368..383 (Active sticker slot 5)
    vec4  u_sticker6;            // 384..399 (Active sticker slot 6)
    vec4  u_sticker7;            // 400..415 (Active sticker slot 7)
    vec4  u_substrate;           // 416..431 (idA, idB, blend, detailStrength; total 432 bytes, 16-byte aligned)
};

layout(binding = 1) uniform sampler2D u_text_texture;

// --- Fast GPU Noise & Hash Primitives ---
float hash12(vec2 p) {
    p = fract(p * vec2(5.3983, 5.4427));
    p += dot(p.yx, p.xy + vec2(21.5351, 14.3137));
    return fract(p.x * p.y * 95.4337);
}

// Sine-free 2D hash (precision-safe at arbitrary coordinates, matches QML CPU hash22)
vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return -1.0 + 2.0 * fract((p3.xx + p3.yz) * p3.zy);
}

vec3 hash32(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yxz + 33.33);
    return fract((p3.xxy + p3.yzz) * p3.zyx);
}

float noise2D(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    // Periodic modulo 256.0 lattice wrapping prevents float precision degradation over long runtimes
    vec2 i00 = mod(i + vec2(0.0, 0.0), 256.0);
    vec2 i10 = mod(i + vec2(1.0, 0.0), 256.0);
    vec2 i01 = mod(i + vec2(0.0, 1.0), 256.0);
    vec2 i11 = mod(i + vec2(1.0, 1.0), 256.0);
    return mix(mix(dot(hash22(i00), f - vec2(0.0, 0.0)),
                   dot(hash22(i10), f - vec2(1.0, 0.0)), u.x),
               mix(dot(hash22(i01), f - vec2(0.0, 1.0)),
                   dot(hash22(i11), f - vec2(1.0, 1.0)), u.x), u.y);
}

// --- Real-Time Glinty Appearances via Distributed Binomial Laws (Deliot & Belcour, HPG 2023) ---
// Pure-ALU O(1) constant-time procedural glint evaluation with zero texture lookups.
// Uses equilateral simplex grid barycentric blending + bilinear slope-space binomial gating.
// All simplex coordinates are wrapped seamlessly modulo a power-of-2 period (4096.0) to ensure
// zero floating-point precision loss over indefinite scrolling runtimes.

// Standard normal N(0, 1) sample via Box-Muller transform
float sampleStdNormal(float u1, float u2) {
    return sqrt(-2.0 * log(max(1e-4, u1))) * cos(6.2831853 * u2);
}

// Macro Beckmann 2D slope distribution P22(slope)
float p22_beckmann(vec2 slope, float alpha) {
    float a2 = alpha * alpha;
    return exp(-dot(slope, slope) / a2) / (3.14159265 * a2);
}

// Equilateral simplex grid decomposition from pre-skewed coordinates with seamless periodic wrapping
void evalGlintSimplexGridSkewed(vec2 skewed, float period, out vec2 v0, out vec2 v1, out vec2 v2, out vec3 bary) {
    vec2 baseId = floor(skewed);
    vec3 temp = vec3(fract(skewed), 0.0);
    temp.z = 1.0 - temp.x - temp.y;
    float s = step(0.0, -temp.z);
    float s2 = 2.0 * s - 1.0;
    v0 = mod(baseId + vec2(s, s), period);
    v1 = mod(baseId + vec2(s, 1.0 - s), period);
    v2 = mod(baseId + vec2(1.0 - s, s), period);
    bary = vec3(-temp.z * s2, s - temp.y * s2, s - temp.x * s2);
}

// Evaluates a single slope-space corner's gated binomial microfacet count
float evalBinomialSlopeCorner(vec2 sCell, vec2 vertexSeed, float oneHitProba, float smoothW, float meanHits, float stdHits, float N) {
    vec3 r = hash32(sCell + vertexSeed);
    float randB = r.x;
    float randG = sampleStdNormal(r.y, r.z);
    float gating = (smoothW > 1e-6)
        ? clamp((oneHitProba + smoothW - randB) / (2.0 * smoothW), 0.0, 1.0)
        : step(randB, oneHitProba);
    float count = clamp(randG * stdHits + meanHits, 1.0, max(1.0, N));
    return gating * count;
}

// Bilinearly interpolated angular binomial count for one surface simplex vertex
float evalAngularBinomialCell(vec2 slope, vec2 vertexSeed, vec2 slopeOffset, float halfwaySlopeScale, float hitProba, float N) {
    // Probability of hitting at least one microfacet in the footprint
    float oneHitProba = (N < 1.0)
        ? (hitProba * N)
        : (1.0 - pow(max(1e-6, 1.0 - hitProba), N));
    float meanHits = 1.0 + max(0.0, N - 1.0) * hitProba;
    float stdHits  = sqrt(max(0.0, N - 1.0) * hitProba * (1.0 - hitProba));
    float smoothW  = 0.1 * clamp(oneHitProba * 10.0, 0.0, 1.0) * clamp((1.0 - oneHitProba) * 10.0, 0.0, 1.0);

    vec2 sCoord = slope * halfwaySlopeScale + slopeOffset * 97.31;
    vec2 sCell  = floor(sCoord);
    vec2 sLerp  = fract(sCoord);

    float c00 = evalBinomialSlopeCorner(sCell + vec2(0.0, 0.0), vertexSeed, oneHitProba, smoothW, meanHits, stdHits, N);
    float c10 = evalBinomialSlopeCorner(sCell + vec2(1.0, 0.0), vertexSeed, oneHitProba, smoothW, meanHits, stdHits, N);
    float c01 = evalBinomialSlopeCorner(sCell + vec2(0.0, 1.0), vertexSeed, oneHitProba, smoothW, meanHits, stdHits, N);
    float c11 = evalBinomialSlopeCorner(sCell + vec2(1.0, 1.0), vertexSeed, oneHitProba, smoothW, meanHits, stdHits, N);

    return mix(mix(c00, c10, sLerp.x), mix(c01, c11, sLerp.x), sLerp.y);
}

// Evaluates one LOD level of the Deliot & Belcour (2023) simplex glint grid
float sampleDeliotGlintSimplex(
    vec2 screenSkewed, vec2 scrollSkewed, float div, float lodSeed, vec2 slope, float footprintArea,
    float p22, float halfwaySlopeScale, float logDensity, float densityRand, float gridWeight
) {
    float period = max(1.0, 4096.0 / div);
    vec2 skewed = (screenSkewed + scrollSkewed) / div;
    vec2 v0, v1, v2;
    vec3 bary;
    evalGlintSimplexGridSkewed(skewed, period, v0, v1, v2, bary);

    vec2 seedOff = vec2(lodSeed * 37.17, lodSeed * 91.53);
    vec3 r0 = hash32(v0 + seedOff);
    vec3 r1 = hash32(v1 + seedOff);
    vec3 r2 = hash32(v2 + seedOff);

    // Per-vertex stochastic microfacet density randomization (zeta)
    float g0 = sampleStdNormal(r0.x, hash12(v0 * 13.7 + seedOff));
    float g1 = sampleStdNormal(r1.x, hash12(v1 * 13.7 + seedOff));
    float g2 = sampleStdNormal(r2.x, hash12(v2 * 13.7 + seedOff));

    vec3 nTotal = exp(clamp(vec3(logDensity) + vec3(g0, g1, g2) * densityRand, 0.0, 18.0));
    vec3 nFootprint = nTotal * footprintArea;
    vec3 nWeighted  = nFootprint * gridWeight;

    float slopeCellArea = 1.0 / (halfwaySlopeScale * halfwaySlopeScale);
    float hitProba = clamp(p22 * slopeCellArea, 0.0, 0.999);

    float k0 = evalAngularBinomialCell(slope, v0 * 19.31 + seedOff, r0.yz, halfwaySlopeScale, hitProba, nWeighted.x);
    float k1 = evalAngularBinomialCell(slope, v1 * 19.31 + seedOff, r1.yz, halfwaySlopeScale, hitProba, nWeighted.y);
    float k2 = evalAngularBinomialCell(slope, v2 * 19.31 + seedOff, r2.yz, halfwaySlopeScale, hitProba, nWeighted.z);

    // Strictly energy-conserving slope distribution estimate P22_hat
    vec3 p22Hat = vec3(k0, k1, k2) / max(vec3(1e-4), nFootprint * slopeCellArea);
    return dot(p22Hat, bary);
}

// Multiscale 2-LOD Deliot & Belcour (2023) glint slope distribution P22_glint
// Takes scroll-free screenSkewed, 64-bit-wrapped scrollSkewed (mod 4096.0), and scroll-free footprintLen.
float evalDeliotGlintP22(
    vec2 screenSkewed, vec2 scrollSkewed, float footprintLen,
    vec2 slope, float alpha, float halfwaySlopeScale,
    float logDensity, float densityRand, float screenSpaceScale
) {
    float p22 = p22_beckmann(slope, alpha);
    if (p22 < 1e-4) return 0.0;

    float lod = clamp(log2(max(1e-5, footprintLen * screenSpaceScale)), -4.0, 10.0);
    float lod0 = floor(lod);
    float lodFrac = fract(lod);
    float div0 = exp2(lod0);
    float div1 = div0 * 2.0;

    float area0 = div0 * div0;
    float area1 = div1 * div1;

    float s0 = sampleDeliotGlintSimplex(screenSkewed, scrollSkewed, div0, lod0,       slope, area0, p22, halfwaySlopeScale, logDensity, densityRand, 1.0 - lodFrac);
    float s1 = sampleDeliotGlintSimplex(screenSkewed, scrollSkewed, div1, lod0 + 1.0, slope, area1, p22, halfwaySlopeScale, logDensity, densityRand, lodFrac);
    return s0 + s1;
}

// --- Wave-Optics Thin-Film Iridescence & Multi-Order Diffraction Gratings ---
// 1. Thin-film iridescence: Belcour & Barla (SIGGRAPH 2017), Airy summation + CIE XYZ Gaussian sensitivity.
// 2. Spectral conversion: Wyman, Sloan & Shirley (JCGT 2013), analytic CIE 1931 XYZ color matching.
// 3. Holographic grating: Stam (1999) / Toisoul & Ghosh (SIGGRAPH 2017), multi-order Kirchhoff equation.

const mat3 XYZ_TO_REC709 = mat3(
     3.2404542, -0.9692660,  0.0556434,
    -1.5371385,  1.8760108, -0.2040259,
    -0.4985314,  0.0415560,  1.0572252
);

// Analytic Fourier transform of the CIE XYZ sensitivity curves (Belcour & Barla 2017, Eq. 9)
// Pre-scaled to O(1) micrometer units for full float32/float16 numerical safety.
vec3 evalSensitivity(float opd_um, vec3 shift) {
    float phase = 6.2831853 * opd_um;
    float phase2 = phase * phase;
    vec3 amp = vec3(0.846590, 1.000222, 1.001122);
    vec3 pos = vec3(1.6810, 1.7953, 2.2084);
    vec3 var = vec3(0.004328, 0.009305, 0.006612);

    vec3 xyz = amp * cos(pos * phase + shift) * exp(-var * phase2);
    xyz.x += 0.153868 * cos(2.2399 * phase + shift.x) * exp(-0.004528 * phase2);
    return XYZ_TO_REC709 * xyz;
}

// Dielectric Fresnel reflectance and reflection phase shift at thin-film interface
void fresnelDielectric(float ct1, float n1, float n2, out float R, out float phi) {
    float st1 = 1.0 - ct1 * ct1;
    float nr = n1 / n2;
    if (nr * nr * st1 > 1.0) {
        R = 1.0;
        phi = 0.0;
        return;
    }
    float ct2 = sqrt(max(0.0, 1.0 - nr * nr * st1));
    float rs = (n1 * ct1 - n2 * ct2) / max(1e-5, n1 * ct1 + n2 * ct2);
    float rp = (n2 * ct1 - n1 * ct2) / max(1e-5, n2 * ct1 + n1 * ct2);
    R = 0.5 * (rs * rs + rp * rp);
    phi = (n1 < n2) ? 3.14159265 : 0.0;
}

// Physically based thin-film iridescence reflectance in linear RGB (Belcour & Barla 2017)
// cosTheta1: dot(H, V), dinc_um: film thickness in micrometers (0.20..0.95), eta2: film IOR (~1.3..1.8)
vec3 evalIridescence(float cosTheta1, float dinc_um, float eta2, vec3 baseF0) {
    float eta1 = 1.0;
    float sinTheta2Sq = (eta1 / eta2) * (eta1 / eta2) * (1.0 - cosTheta1 * cosTheta1);
    float cosTheta2 = sqrt(max(0.001, 1.0 - sinTheta2Sq));

    float opd_um = 2.0 * eta2 * dinc_um * cosTheta2;

    float R12, phi12;
    fresnelDielectric(cosTheta1, eta1, eta2, R12, phi12);
    float T121 = 1.0 - R12;

    vec3 R23 = baseF0 + (vec3(1.0) - baseF0) * pow(clamp(1.0 - cosTheta2, 0.0, 1.0), 5.0);
    vec3 phi23 = vec3(3.14159265);

    vec3 phi21 = vec3(3.14159265 - phi12);
    vec3 phi = phi21 + phi23;

    vec3 R123 = clamp(R12 * R23, vec3(1e-5), vec3(0.9999));
    vec3 r123 = sqrt(R123);
    vec3 Rs = (T121 * T121) * R23 / (vec3(1.0) - R123);

    // DC reflectance + Airy multi-bounce interference orders m = 1, 2
    vec3 I = vec3(R12) + Rs;
    vec3 Cm = (Rs - vec3(T121)) * r123;
    I += 2.0 * Cm * evalSensitivity(opd_um, phi);
    Cm *= r123;
    I += 2.0 * Cm * evalSensitivity(2.0 * opd_um, 2.0 * phi);

    return max(vec3(0.0), I);
}

// Analytic CIE 1931 XYZ color-matching approximation (Wyman, Sloan & Shirley, JCGT 2013)
// Converts physical wavelength lambda_nm in [380, 750] nm to linear sRGB.
vec3 wavelengthToRGB(float lambda_nm) {
    if (lambda_nm < 380.0 || lambda_nm > 750.0) return vec3(0.0);
    float t1 = (lambda_nm - 442.0) * ((lambda_nm < 442.0) ? 0.0624 : 0.0374);
    float t2 = (lambda_nm - 599.8) * ((lambda_nm < 599.8) ? 0.0264 : 0.0323);
    float t3 = (lambda_nm - 501.1) * ((lambda_nm < 501.1) ? 0.0490 : 0.0382);
    float x = 0.362 * exp(-0.5 * t1 * t1) + 1.056 * exp(-0.5 * t2 * t2) - 0.065 * exp(-0.5 * t3 * t3);

    float u1 = (lambda_nm - 568.8) * ((lambda_nm < 568.8) ? 0.0213 : 0.0247);
    float u2 = (lambda_nm - 530.9) * ((lambda_nm < 530.9) ? 0.0613 : 0.0322);
    float y = 0.821 * exp(-0.5 * u1 * u1) + 0.286 * exp(-0.5 * u2 * u2);

    float v1 = (lambda_nm - 437.0) * ((lambda_nm < 437.0) ? 0.0845 : 0.0278);
    float v2 = (lambda_nm - 459.0) * ((lambda_nm < 459.0) ? 0.0385 : 0.0725);
    float z = 1.217 * exp(-0.5 * v1 * v1) + 0.681 * exp(-0.5 * v2 * v2);

    return max(vec3(0.0), XYZ_TO_REC709 * vec3(x, y, z));
}

// Multi-order Kirchhoff diffraction grating (Stam 1999 / Toisoul & Ghosh SIGGRAPH 2017)
// Solves d * |dot(T, L + V) + radialMod| = m * lambda across orders m = 1..4.
vec3 evalDiffractionGrating(vec3 T_grating, vec3 L, vec3 V, float d_nm, float radialMod) {
    float opticalPath = d_nm * abs(dot(T_grating, L + V) + radialMod);
    vec3 spectrum = vec3(0.0);
    spectrum += wavelengthToRGB(opticalPath)          * 1.00;
    spectrum += wavelengthToRGB(opticalPath * 0.5000) * 0.58;
    spectrum += wavelengthToRGB(opticalPath * 0.3333) * 0.34;
    spectrum += wavelengthToRGB(opticalPath * 0.2500) * 0.20;
    return spectrum;
}

// --- Multi-Substrate Pure-ALU Periodic Procedural Material Library (12 Archetypes) ---
// All coordinates are wrapped modulo 256.0 so indefinite scrolling never loses float32 precision.

float fbm3(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    vec2 q = mod(p, 256.0);
    for (int i = 0; i < 3; ++i) {
        v += a * noise2D(q);
        q = mod(q * 2.03 + vec2(17.1, 31.7), 256.0);
        a *= 0.5;
    }
    return v;
}

// Fast 3x3 periodic Voronoi returning vec3(d1, edgeDist = d2 - d1, cellHash)
vec3 voronoi2D(vec2 p) {
    vec2 n = floor(p);
    vec2 f = fract(p);
    float d1 = 8.0;
    float d2 = 8.0;
    float cid = 0.0;
    for (int j = -1; j <= 1; ++j) {
        for (int i = -1; i <= 1; ++i) {
            vec2 g = vec2(float(i), float(j));
            vec2 cell = mod(n + g, 256.0);
            vec2 o = 0.5 + 0.42 * hash22(cell);
            vec2 r = g + o - f;
            float d = dot(r, r);
            if (d < d1) {
                d2 = d1;
                d1 = d;
                cid = hash12(cell * 13.7 + vec2(4.1, 9.3));
            } else if (d < d2) {
                d2 = d;
            }
        }
    }
    float rd1 = sqrt(d1);
    float rd2 = sqrt(d2);
    return vec3(rd1, rd2 - rd1, cid);
}

struct SubstrateSample {
    float height;      // Tactile relief offset for heightfield normal
    float albedoMix;   // 0..1 blend between u_color_stone and u_color_porcelain
    float accentMask;  // 0..1 highlight mask (Kintsugi gold, oil-spot, pyrite vein, flame, char)
    float gloss;       // 0..1 surface glossiness (0 = chalky matte, 1 = mirror lacquer/glaze)
    float chatoyancy;  // -1..1 optical fiber tilt for Tiger-Flame Maple shimmer
};

SubstrateSample evalSubstrateById(vec2 pos, int id) {
    SubstrateSample s;
    s.height = 0.0;
    s.albedoMix = 0.0;
    s.accentMask = 0.0;
    s.gloss = 0.35;
    s.chatoyancy = 0.0;

    if (id == 0) {
        // 0: Song Celadon & Kintsugi Crackle Porcelain
        vec2 warp = vec2(fbm3(pos * 1.1), fbm3(pos * 1.1 + vec2(11.4, 7.2))) * 0.45;
        vec3 vor = voronoi2D(mod(pos * 1.65 + warp, 256.0));
        float crack = smoothstep(0.055, 0.008, vor.y);
        float fineCrack = smoothstep(0.032, 0.004, voronoi2D(mod(pos * 3.8 + warp * 1.4, 256.0)).y);
        float kintsugi = crack * smoothstep(0.35, 0.72, vor.z);
        float glazePool = fbm3(pos * 0.9) * 0.5 + 0.5;
        s.height = -crack * 0.032 - fineCrack * 0.012 + glazePool * 0.010;
        s.albedoMix = clamp(glazePool * 0.42 + fineCrack * 0.15, 0.0, 1.0);
        s.accentMask = kintsugi;
        s.gloss = mix(0.88, 0.25, crack);
    } else if (id == 1) {
        // 1: Tenmoku Oil-Spot & Hare's Fur Ceramic
        vec2 streakP = vec2(pos.x * 9.5, pos.y * 1.6);
        float fur = fbm3(streakP + vec2(0.0, fbm3(pos * 1.4) * 1.8)) * 0.5 + 0.5;
        vec3 spotVor = voronoi2D(mod(pos * 4.2, 256.0));
        float oilSpot = smoothstep(0.28, 0.08, spotVor.x) * step(0.42, spotVor.z);
        s.height = (fur - 0.5) * 0.018 + oilSpot * 0.016;
        s.albedoMix = fur * 0.35;
        s.accentMask = clamp(oilSpot * 1.15 + smoothstep(0.68, 0.92, fur) * 0.35, 0.0, 1.0);
        s.gloss = mix(0.75, 0.96, oilSpot);
    } else if (id == 2) {
        // 2: Domain-Warped Veined Marble / Lapislazuli Mineral
        vec2 w1 = vec2(fbm3(pos * 0.85), fbm3(pos * 0.85 + vec2(5.2, 13.8)));
        float ridge = 1.0 - abs(noise2D(mod(pos * 1.4 + w1 * 1.65, 256.0)));
        float vein = pow(clamp(ridge, 0.0, 1.0), 6.0);
        float cloud = fbm3(pos * 1.9 + w1) * 0.5 + 0.5;
        float fineGrain = noise2D(mod(pos * 18.0, 256.0)) * 0.008;
        s.height = cloud * 0.018 - vein * 0.015 + fineGrain;
        s.albedoMix = clamp(cloud * 0.45 + vein * 0.65, 0.0, 1.0);
        s.accentMask = vein * 0.75;
        s.gloss = mix(0.32, 0.78, vein);
    } else if (id == 3) {
        // 3: Conchoidal Volcanic Obsidian Glass
        vec3 vor = voronoi2D(mod(pos * 1.35 + fbm3(pos * 0.7) * 0.35, 256.0));
        float ripple = sin(vor.x * 26.0 + fbm3(pos * 2.4) * 3.0) * 0.5 + 0.5;
        float ridge = smoothstep(0.14, 0.01, vor.y);
        s.height = ripple * 0.022 + ridge * 0.026;
        s.albedoMix = clamp(ripple * 0.25 + ridge * 0.35, 0.0, 1.0);
        s.accentMask = ridge * 0.65;
        s.gloss = mix(0.92, 0.45, ridge);
    } else if (id == 4) {
        // 4: Stepped Hopper-Crystal Bismuth Terraces (interlocking dual-scale crystal lattices)
        vec2 pQ1 = mod(pos * 1.15, 256.0);
        vec2 c1 = floor(pQ1);
        vec2 j1 = hash22(mod(c1, 256.0) * 17.3) * 0.16;
        vec2 f1 = fract(pQ1) - 0.5 + j1;
        float cheb1 = max(abs(f1.x), abs(f1.y));
        float steps1 = floor(cheb1 * 8.0) / 8.0;
        float bev1 = smoothstep(0.055, 0.0, abs(fract(cheb1 * 8.0) - 0.5));

        // Secondary offset crystal cluster at different scale for organic interlocking terraces
        vec2 pQ2 = mod(pos * 1.85 + vec2(4.3, 7.1), 256.0);
        vec2 c2 = floor(pQ2);
        vec2 f2 = fract(pQ2) - 0.5;
        float cheb2 = max(abs(f2.x), abs(f2.y));
        float steps2 = floor(cheb2 * 6.0) / 6.0;
        float mask2 = step(0.45, hash12(mod(c2, 256.0) * 29.1));

        float steps = mix(steps1, min(steps1, steps2), mask2 * 0.65);
        float bevel = max(bev1, smoothstep(0.055, 0.0, abs(fract(cheb2 * 6.0) - 0.5)) * mask2);
        float cellH = hash12(mod(c1, 256.0) * 19.7);
        s.height = (1.0 - steps) * 0.048 + cellH * 0.018 - bevel * 0.008;
        s.albedoMix = clamp(steps * 0.42 + bevel * 0.25, 0.0, 1.0);
        s.accentMask = clamp(bevel * 0.85 + (1.0 - steps) * 0.35, 0.0, 1.0);
        s.gloss = 0.88;
    } else if (id == 5) {
        // 5: Hand-Hammered Tsuchime Metal
        vec3 vor = voronoi2D(mod(pos * 3.4, 256.0));
        float dimple = vor.x * vor.x;
        float rim = smoothstep(0.12, 0.01, vor.y);
        float brush = noise2D(mod(vec2(pos.x * 42.0, pos.y * 6.0), 256.0)) * 0.004;
        s.height = (dimple - 0.35) * 0.055 + rim * 0.012 + brush;
        s.albedoMix = clamp(0.18 + (1.0 - dimple) * 0.32 + rim * 0.22, 0.0, 1.0);
        s.accentMask = rim * 0.55;
        s.gloss = 0.82;
    } else if (id == 6) {
        // 6: Organic Abalone Nacre Growth Lamellae (rich layered aragonite bands, controlled luminance)
        float f = fbm3(pos * 1.25);
        float rings = sin(pos.x * 2.8 + pos.y * 2.1 + f * 11.5) * 0.5 + 0.5;
        float fineBand = sin(pos.x * 9.0 + pos.y * 6.5 + f * 18.0) * 0.5 + 0.5;
        float lamella = pow(rings, 1.8) * 0.72 + fineBand * 0.28;
        float stepMicro = floor(rings * 6.0) / 6.0;
        s.height = mix(lamella, stepMicro, 0.4) * 0.030;
        s.albedoMix = clamp(lamella * 0.30, 0.0, 1.0);
        s.accentMask = smoothstep(0.55, 0.92, rings) * 0.72;
        s.gloss = 0.84;
    } else if (id == 7) {
        // 7: Chatoyant Tiger-Flame Maple Lutherie (fine curly violin-grade maple)
        vec2 wp = vec2(pos.x * 1.4, pos.y * 11.0);
        float grainWarp = fbm3(vec2(pos.x * 0.9, pos.y * 2.8)) * 2.6;
        float ring = sin(wp.y + grainWarp) * 0.5 + 0.5;
        float latewood = smoothstep(0.62, 0.92, ring);
        // Tighter organic curly maple flame (optical chatoyancy)
        float flameWarp = sin(pos.y * 1.8) * 1.35 + fbm3(pos * 1.35) * 4.4;
        float flame = sin(pos.x * 15.0 + flameWarp);
        float fineFiber = noise2D(mod(vec2(pos.x * 8.0, pos.y * 52.0), 256.0));
        s.height = (ring - 0.5) * 0.015 + flame * 0.007 + fineFiber * 0.009;
        s.albedoMix = clamp((1.0 - latewood) * 0.48 + (flame * 0.5 + 0.5) * 0.24 + fineFiber * 0.08, 0.0, 1.0);
        s.accentMask = clamp((flame * 0.5 + 0.5) * 0.55, 0.0, 1.0);
        s.gloss = 0.90;
        s.chatoyancy = flame * 0.75;
    } else if (id == 8) {
        // 8: Swirling Burl Walnut & French Polish (Luxury Wood)
        vec3 bVor = voronoi2D(mod(pos * 1.15 + fbm3(pos * 0.9) * 0.5, 256.0));
        float burlRing = sin(bVor.x * 24.0 + fbm3(pos * 2.2) * 4.5) * 0.5 + 0.5;
        float knotCore = smoothstep(0.16, 0.02, bVor.x);
        float pores = smoothstep(0.62, 0.88, noise2D(mod(vec2(pos.x * 8.0, pos.y * 44.0), 256.0)));
        s.height = burlRing * 0.016 - pores * 0.014 - knotCore * 0.012;
        s.albedoMix = clamp(burlRing * 0.62 * (1.0 - knotCore * 0.75) * (1.0 - pores * 0.5), 0.0, 1.0);
        s.accentMask = smoothstep(0.72, 0.96, burlRing) * 0.45;
        s.gloss = mix(0.88, 0.30, pores);
    } else if (id == 9) {
        // 9: Shou Sugi Ban Charred Japanese Cedar (Craft Wood)
        vec2 charP = vec2(pos.x * 6.5, pos.y * 2.1);
        vec3 cVor = voronoi2D(mod(charP + vec2(fbm3(pos * 1.5) * 0.4, 0.0), 256.0));
        float charCrack = smoothstep(0.11, 0.015, cVor.y);
        float woodGrain = sin(pos.x * 16.0 + fbm3(pos * 1.8) * 3.5) * 0.5 + 0.5;
        float charScale = (1.0 - charCrack) * (0.65 + 0.35 * cVor.z);
        s.height = charScale * 0.036 - charCrack * 0.025 + woodGrain * 0.008;
        s.albedoMix = clamp(charCrack * 0.85 + woodGrain * 0.18, 0.0, 1.0);
        s.accentMask = charCrack * woodGrain;
        s.gloss = mix(0.10, 0.55, charCrack);
    } else if (id == 10) {
        // 10: Raw Construction Pine / Knotted Lumber (Rustic Wood)
        vec3 kVor = voronoi2D(mod(vec2(pos.x * 0.65, pos.y * 0.32), 256.0));
        float knot = smoothstep(0.19, 0.04, kVor.x) * step(0.45, kVor.z);
        float knotWarp = exp(-kVor.x * 5.5) * 2.4 * step(0.45, kVor.z);
        float arch = sin(pos.x * 5.8 + fbm3(vec2(pos.x * 0.9, pos.y * 0.4)) * 4.2 + knotWarp);
        // Asymmetric earlywood/latewood sawtooth profile
        float latewood = smoothstep(0.55, 0.92, arch * 0.5 + 0.5);
        float sawChatter = sin(pos.y * 38.0) * 0.005;
        float fibrous = noise2D(mod(vec2(pos.x * 28.0, pos.y * 4.5), 256.0)) * 0.009;
        s.height = (1.0 - latewood) * 0.014 - knot * 0.022 + sawChatter + fibrous;
        s.albedoMix = clamp((1.0 - latewood) * 0.78 * (1.0 - knot * 0.88), 0.0, 1.0);
        s.accentMask = knot * 0.25;
        s.gloss = 0.08;
    } else {
        // 11: Weathered Silver Driftwood (Rustic Sun-Bleached Wood)
        float warp = fbm3(vec2(pos.x * 1.1, pos.y * 0.45)) * 3.0;
        float grooves = sin(pos.x * 14.0 + warp) * 0.5 + 0.5;
        float eroded = pow(grooves, 1.8);
        float splitRidge = 1.0 - abs(noise2D(mod(vec2(pos.x * 4.5 + warp * 0.25, pos.y * 0.7), 256.0)));
        float splitCrack = pow(clamp(splitRidge, 0.0, 1.0), 10.0);
        float dryGrain = noise2D(mod(vec2(pos.x * 32.0, pos.y * 6.0), 256.0)) * 0.012;
        s.height = eroded * 0.040 - splitCrack * 0.048 + dryGrain;
        s.albedoMix = clamp(eroded * 0.72 * (1.0 - splitCrack * 0.92), 0.0, 1.0);
        s.accentMask = 0.0;
        s.gloss = 0.05;
    }
    return s;
}

SubstrateSample evalSubstrate(vec2 pos) {
    int idA = clamp(int(floor(u_substrate.x + 0.5)), 0, 11);
    int idB = clamp(int(floor(u_substrate.y + 0.5)), 0, 11);
    float b = clamp(u_substrate.z, 0.0, 1.0);
    SubstrateSample sA = evalSubstrateById(pos, idA);
    if (b > 0.001 && idA != idB) {
        SubstrateSample sB = evalSubstrateById(pos, idB);
        sA.height     = mix(sA.height,     sB.height,     b);
        sA.albedoMix  = mix(sA.albedoMix,  sB.albedoMix,  b);
        sA.accentMask = mix(sA.accentMask, sB.accentMask, b);
        sA.gloss      = mix(sA.gloss,      sB.gloss,      b);
        sA.chatoyancy = mix(sA.chatoyancy, sB.chatoyancy, b);
    }
    return sA;
}

// --- 2D Signed Distance Field (SDF) Primitives ---
float sdSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}

float sdCircle(vec2 p, float r) {
    return length(p) - r;
}

float sdRing(vec2 p, float r, float th) {
    return abs(length(p) - r) - th;
}

float sdBox(vec2 p, vec2 b) {
    vec2 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

float sdRhombus(vec2 p, vec2 b) {
    vec2 q = abs(p);
    float h = clamp((-2.0 * dot(q, b) + dot(b, b)) / dot(b, b), -1.0, 1.0);
    float d = length(q - 0.5 * b * vec2(1.0 - h, 1.0 + h));
    return d * sign(q.x * b.y + q.y * b.x - b.x * b.y);
}

// --- Subroutine 1: Classical Roman Serif & Modern Technical Sans-Serif (IDs 0..28) ---
float evalSerifSansSDF(vec2 p, int id) {
    float d = 1e5;
    
    // --- Classical Roman Serif Letters (IDs 0..15) ---
    if (id == 0) {
        // Serif 'A'
        d = min(d, sdSegment(p, vec2(-0.20, -0.32), vec2(0.0, 0.32)) - 0.024);
        d = min(d, sdSegment(p, vec2(0.20, -0.32), vec2(0.0, 0.32)) - 0.024);
        d = min(d, sdSegment(p, vec2(-0.13, -0.06), vec2(0.13, -0.06)) - 0.020);
        d = min(d, sdSegment(p, vec2(-0.26, -0.32), vec2(-0.14, -0.32)) - 0.018);
        d = min(d, sdSegment(p, vec2(0.14, -0.32), vec2(0.26, -0.32)) - 0.018);
    } else if (id == 1) {
        // Serif 'B'
        d = min(d, sdSegment(p, vec2(-0.18, -0.32), vec2(-0.18, 0.32)) - 0.024);
        vec2 pU = p - vec2(-0.06, 0.15);
        float bU = max(sdRing(pU, 0.14, 0.022), -pU.x);
        vec2 pD = p - vec2(-0.04, -0.15);
        float bD = max(sdRing(pD, 0.16, 0.022), -pD.x);
        d = min(d, min(bU, bD));
        d = min(d, sdSegment(p, vec2(-0.24, 0.32), vec2(-0.12, 0.32)) - 0.018);
        d = min(d, sdSegment(p, vec2(-0.24, -0.32), vec2(-0.12, -0.32)) - 0.018);
    } else if (id == 2) {
        // Serif 'C'
        float ring = sdRing(p, 0.24, 0.024);
        float openCut = max(ring, p.x - 0.04);
        d = min(d, openCut);
        d = min(d, sdSegment(p, vec2(0.04, 0.24), vec2(0.18, 0.24)) - 0.020);
        d = min(d, sdSegment(p, vec2(0.04, -0.24), vec2(0.18, -0.24)) - 0.020);
    } else if (id == 3) {
        // Serif 'D'
        d = min(d, sdSegment(p, vec2(-0.18, -0.32), vec2(-0.18, 0.32)) - 0.024);
        vec2 pBowl = p - vec2(-0.06, 0.0);
        float bowl = max(sdRing(pBowl * vec2(0.9, 0.8), 0.25, 0.022), -pBowl.x);
        d = min(d, bowl);
        d = min(d, sdSegment(p, vec2(-0.25, 0.32), vec2(-0.11, 0.32)) - 0.018);
        d = min(d, sdSegment(p, vec2(-0.25, -0.32), vec2(-0.11, -0.32)) - 0.018);
    } else if (id == 4) {
        // Serif 'E'
        d = min(d, sdSegment(p, vec2(-0.18, -0.32), vec2(-0.18, 0.32)) - 0.024);
        d = min(d, sdSegment(p, vec2(-0.18, 0.30), vec2(0.18, 0.30)) - 0.022);
        d = min(d, sdSegment(p, vec2(-0.18, 0.0), vec2(0.10, 0.0)) - 0.020);
        d = min(d, sdSegment(p, vec2(-0.18, -0.30), vec2(0.18, -0.30)) - 0.022);
        d = min(d, sdSegment(p, vec2(0.18, 0.24), vec2(0.18, 0.34)) - 0.018);
        d = min(d, sdSegment(p, vec2(0.18, -0.24), vec2(0.18, -0.34)) - 0.018);
    } else if (id == 5) {
        // Serif 'G'
        float ring = sdRing(p, 0.24, 0.024);
        float openCut = max(ring, p.x - 0.06);
        d = min(d, openCut);
        d = min(d, sdSegment(p, vec2(0.06, -0.06), vec2(0.20, -0.06)) - 0.022);
        d = min(d, sdSegment(p, vec2(0.20, -0.22), vec2(0.20, 0.0)) - 0.022);
    } else if (id == 6) {
        // Serif 'M'
        d = min(d, sdSegment(p, vec2(-0.22, -0.32), vec2(-0.22, 0.32)) - 0.022);
        d = min(d, sdSegment(p, vec2(0.22, -0.32), vec2(0.22, 0.32)) - 0.022);
        d = min(d, sdSegment(p, vec2(-0.22, 0.32), vec2(0.0, -0.08)) - 0.022);
        d = min(d, sdSegment(p, vec2(0.22, 0.32), vec2(0.0, -0.08)) - 0.022);
        d = min(d, sdSegment(p, vec2(-0.28, -0.32), vec2(-0.16, -0.32)) - 0.016);
        d = min(d, sdSegment(p, vec2(0.16, -0.32), vec2(0.28, -0.32)) - 0.016);
    } else if (id == 7) {
        // Serif 'N'
        d = min(d, sdSegment(p, vec2(-0.18, -0.32), vec2(-0.18, 0.32)) - 0.022);
        d = min(d, sdSegment(p, vec2(0.18, -0.32), vec2(0.18, 0.32)) - 0.022);
        d = min(d, sdSegment(p, vec2(-0.18, 0.32), vec2(0.18, -0.32)) - 0.024);
        d = min(d, sdSegment(p, vec2(-0.24, -0.32), vec2(-0.12, -0.32)) - 0.016);
        d = min(d, sdSegment(p, vec2(0.12, 0.32), vec2(0.24, 0.32)) - 0.016);
    } else if (id == 8) {
        // Serif 'Q'
        d = min(d, sdRing(p, 0.23, 0.024));
        d = min(d, sdSegment(p, vec2(0.06, -0.12), vec2(0.26, -0.34)) - 0.024);
        d = min(d, sdSegment(p, vec2(0.18, -0.34), vec2(0.30, -0.30)) - 0.020);
    } else if (id == 9) {
        // Serif 'R'
        d = min(d, sdSegment(p, vec2(-0.18, -0.32), vec2(-0.18, 0.32)) - 0.024);
        vec2 bp = p - vec2(-0.06, 0.12);
        float bowl = max(sdRing(bp, 0.16, 0.022), -bp.x);
        d = min(d, bowl);
        d = min(d, sdSegment(p, vec2(-0.06, -0.04), vec2(0.18, -0.32)) - 0.024);
        d = min(d, sdSegment(p, vec2(-0.25, -0.32), vec2(-0.11, -0.32)) - 0.018);
        d = min(d, sdSegment(p, vec2(-0.25, 0.32), vec2(-0.11, 0.32)) - 0.018);
    } else if (id == 10) {
        // Serif 'S'
        vec2 pU = p - vec2(0.0, 0.13);
        float cU = max(sdRing(pU, 0.15, 0.022), pU.x - 0.02);
        vec2 pD = p - vec2(0.0, -0.13);
        float cD = max(sdRing(pD, 0.15, 0.022), -pD.x - 0.02);
        d = min(d, min(cU, cD));
        d = min(d, sdSegment(p, vec2(-0.10, 0.06), vec2(0.10, -0.06)) - 0.024);
    } else if (id == 11) {
        // Serif 'T'
        d = min(d, sdSegment(p, vec2(0.0, -0.32), vec2(0.0, 0.30)) - 0.024);
        d = min(d, sdSegment(p, vec2(-0.24, 0.30), vec2(0.24, 0.30)) - 0.022);
        d = min(d, sdSegment(p, vec2(-0.08, -0.32), vec2(0.08, -0.32)) - 0.018);
        d = min(d, sdSegment(p, vec2(-0.24, 0.24), vec2(-0.24, 0.34)) - 0.016);
        d = min(d, sdSegment(p, vec2(0.24, 0.24), vec2(0.24, 0.34)) - 0.016);
    } else if (id == 12) {
        // Serif 'V'
        d = min(d, sdSegment(p, vec2(-0.20, 0.32), vec2(0.0, -0.32)) - 0.024);
        d = min(d, sdSegment(p, vec2(0.20, 0.32), vec2(0.0, -0.32)) - 0.024);
        d = min(d, sdSegment(p, vec2(-0.26, 0.32), vec2(-0.14, 0.32)) - 0.018);
        d = min(d, sdSegment(p, vec2(0.14, 0.32), vec2(0.26, 0.32)) - 0.018);
    } else if (id == 13) {
        // Serif 'W'
        d = min(d, sdSegment(p, vec2(-0.26, 0.30), vec2(-0.15, -0.30)) - 0.020);
        d = min(d, sdSegment(p, vec2(-0.15, -0.30), vec2(-0.02, 0.20)) - 0.020);
        d = min(d, sdSegment(p, vec2(-0.02, 0.20), vec2(0.15, -0.30)) - 0.020);
        d = min(d, sdSegment(p, vec2(0.15, -0.30), vec2(0.26, 0.30)) - 0.020);
    } else if (id == 14) {
        // Serif 'Z'
        d = min(d, sdSegment(p, vec2(-0.20, 0.28), vec2(0.20, 0.28)) - 0.024);
        d = min(d, sdSegment(p, vec2(-0.20, -0.28), vec2(0.20, -0.28)) - 0.024);
        d = min(d, sdSegment(p, vec2(0.18, 0.26), vec2(-0.18, -0.26)) - 0.024);
        d = min(d, sdSegment(p, vec2(-0.20, 0.22), vec2(-0.20, 0.32)) - 0.016);
        d = min(d, sdSegment(p, vec2(0.20, -0.22), vec2(0.20, -0.32)) - 0.016);
    } else if (id == 15) {
        // Classical Ampersand '&'
        vec2 pU = p - vec2(0.04, 0.12);
        float loopU = sdRing(pU, 0.13, 0.022);
        vec2 pD = p - vec2(-0.02, -0.14);
        float loopD = sdRing(pD, 0.16, 0.022);
        d = min(d, min(loopU, loopD));
        d = min(d, sdSegment(p, vec2(-0.08, 0.0), vec2(0.24, -0.32)) - 0.022);
        
    // --- Modern Technical Sans-Serif Letters & Digits (IDs 16..28) ---
    } else if (id == 16) {
        // Sans 'F'
        d = min(d, sdSegment(p, vec2(-0.18, -0.32), vec2(-0.18, 0.32)) - 0.026);
        d = min(d, sdSegment(p, vec2(-0.18, 0.30), vec2(0.20, 0.30)) - 0.026);
        d = min(d, sdSegment(p, vec2(-0.18, 0.04), vec2(0.12, 0.04)) - 0.024);
    } else if (id == 17) {
        // Sans 'H'
        d = min(d, sdSegment(p, vec2(-0.20, -0.32), vec2(-0.20, 0.32)) - 0.026);
        d = min(d, sdSegment(p, vec2(0.20, -0.32), vec2(0.20, 0.32)) - 0.026);
        d = min(d, sdSegment(p, vec2(-0.20, 0.0), vec2(0.20, 0.0)) - 0.026);
    } else if (id == 18) {
        // Sans 'J'
        d = min(d, sdSegment(p, vec2(0.10, -0.12), vec2(0.10, 0.32)) - 0.026);
        vec2 pJ = p - vec2(-0.04, -0.12);
        float cradle = max(sdRing(pJ, 0.15, 0.024), pJ.y);
        d = min(d, cradle);
    } else if (id == 19) {
        // Sans 'K'
        d = min(d, sdSegment(p, vec2(-0.18, -0.32), vec2(-0.18, 0.32)) - 0.026);
        d = min(d, sdSegment(p, vec2(-0.16, 0.0), vec2(0.20, 0.30)) - 0.024);
        d = min(d, sdSegment(p, vec2(-0.04, 0.10), vec2(0.20, -0.32)) - 0.024);
    } else if (id == 20) {
        // Sans 'L'
        d = min(d, sdSegment(p, vec2(-0.18, -0.32), vec2(-0.18, 0.32)) - 0.026);
        d = min(d, sdSegment(p, vec2(-0.18, -0.30), vec2(0.20, -0.30)) - 0.026);
    } else if (id == 21) {
        // Sans 'P'
        d = min(d, sdSegment(p, vec2(-0.18, -0.32), vec2(-0.18, 0.32)) - 0.026);
        vec2 pB = p - vec2(-0.06, 0.12);
        float bowl = max(sdRing(pB, 0.16, 0.024), -pB.x);
        d = min(d, bowl);
    } else if (id == 22) {
        // Sans 'U'
        d = min(d, sdSegment(p, vec2(-0.18, -0.10), vec2(-0.18, 0.32)) - 0.026);
        d = min(d, sdSegment(p, vec2(0.18, -0.10), vec2(0.18, 0.32)) - 0.026);
        vec2 pU = p - vec2(0.0, -0.10);
        float cup = max(sdRing(pU, 0.18, 0.024), pU.y);
        d = min(d, cup);
    } else if (id == 23) {
        // Sans 'X'
        d = min(d, sdSegment(p, vec2(-0.22, -0.30), vec2(0.22, 0.30)) - 0.026);
        d = min(d, sdSegment(p, vec2(-0.22, 0.30), vec2(0.22, -0.30)) - 0.026);
    } else if (id == 24) {
        // Sans 'Y'
        d = min(d, sdSegment(p, vec2(-0.20, 0.30), vec2(0.0, 0.02)) - 0.026);
        d = min(d, sdSegment(p, vec2(0.20, 0.30), vec2(0.0, 0.02)) - 0.026);
        d = min(d, sdSegment(p, vec2(0.0, 0.02), vec2(0.0, -0.32)) - 0.026);
    } else if (id == 25) {
        // Technical Digit '1'
        d = min(d, sdSegment(p, vec2(0.04, -0.32), vec2(0.04, 0.32)) - 0.026);
        d = min(d, sdSegment(p, vec2(-0.16, 0.16), vec2(0.04, 0.32)) - 0.024);
        d = min(d, sdSegment(p, vec2(-0.12, -0.32), vec2(0.20, -0.32)) - 0.022);
    } else if (id == 26) {
        // Technical Digit '4'
        d = min(d, sdSegment(p, vec2(0.10, -0.32), vec2(0.10, 0.32)) - 0.026);
        d = min(d, sdSegment(p, vec2(0.10, 0.32), vec2(-0.18, -0.06)) - 0.024);
        d = min(d, sdSegment(p, vec2(-0.20, -0.06), vec2(0.22, -0.06)) - 0.024);
    } else if (id == 27) {
        // Technical Digit '7'
        d = min(d, sdSegment(p, vec2(-0.20, 0.30), vec2(0.20, 0.30)) - 0.026);
        d = min(d, sdSegment(p, vec2(0.20, 0.30), vec2(-0.06, -0.32)) - 0.026);
        d = min(d, sdSegment(p, vec2(-0.04, 0.02), vec2(0.12, 0.02)) - 0.020);
    } else {
        // Technical Digit '8'
        vec2 pU = p - vec2(0.0, 0.12);
        vec2 pD = p - vec2(0.0, -0.12);
        d = min(sdRing(pU, 0.14, 0.024), sdRing(pD, 0.16, 0.024));
    }
    
    return d;
}

// --- Subroutine 2: Historic Scripts (Fraktur, Greek, Runes, Cyrillic) (IDs 29..58) ---
float evalHistoricScriptsSDF(vec2 p, int id) {
    float d = 1e5;
    
    // --- Blackletter / Fraktur Epigraphy (IDs 29..36) ---
    if (id == 29) {
        // Fraktur 'A'
        d = min(d, sdSegment(p, vec2(-0.16, -0.30), vec2(0.0, 0.30)) - 0.030);
        d = min(d, sdSegment(p, vec2(0.16, -0.30), vec2(0.0, 0.30)) - 0.022);
        d = min(d, sdRhombus(p - vec2(0.0, 0.30), vec2(0.08, 0.08)));
        d = min(d, sdSegment(p, vec2(-0.10, -0.06), vec2(0.12, -0.06)) - 0.020);
    } else if (id == 30) {
        // Fraktur 'B'
        d = min(d, sdSegment(p, vec2(-0.16, -0.32), vec2(-0.16, 0.32)) - 0.030);
        d = min(d, sdRhombus(p - vec2(0.06, 0.14), vec2(0.14, 0.12)) - 0.016);
        d = min(d, sdRhombus(p - vec2(0.06, -0.14), vec2(0.16, 0.13)) - 0.016);
    } else if (id == 31) {
        // Fraktur 'D'
        d = min(d, sdSegment(p, vec2(-0.16, -0.32), vec2(-0.16, 0.32)) - 0.030);
        d = min(d, sdRhombus(p - vec2(0.04, 0.0), vec2(0.24, 0.26)) - 0.018);
    } else if (id == 32) {
        // Fraktur 'F'
        d = min(d, sdSegment(p, vec2(-0.10, -0.32), vec2(-0.10, 0.32)) - 0.030);
        d = min(d, sdSegment(p, vec2(-0.18, 0.28), vec2(0.18, 0.28)) - 0.022);
        d = min(d, sdSegment(p, vec2(-0.20, 0.04), vec2(0.12, 0.04)) - 0.024);
        d = min(d, sdRhombus(p - vec2(-0.10, 0.32), vec2(0.08, 0.08)));
    } else if (id == 33) {
        // Fraktur 'G'
        float ring = sdRing(p, 0.24, 0.026);
        d = min(d, max(ring, p.x - 0.06));
        d = min(d, sdSegment(p, vec2(0.06, -0.08), vec2(0.22, -0.08)) - 0.024);
        d = min(d, sdRhombus(p - vec2(0.22, -0.08), vec2(0.07, 0.07)));
    } else if (id == 34) {
        // Fraktur 'H'
        d = min(d, sdSegment(p, vec2(-0.18, -0.32), vec2(-0.18, 0.32)) - 0.030);
        d = min(d, sdSegment(p, vec2(0.18, -0.32), vec2(0.18, 0.32)) - 0.024);
        d = min(d, sdSegment(p, vec2(-0.18, 0.04), vec2(0.18, 0.04)) - 0.022);
        d = min(d, sdRhombus(p - vec2(-0.18, 0.32), vec2(0.08, 0.08)));
    } else if (id == 35) {
        // Fraktur 'Y'
        d = min(d, sdSegment(p, vec2(-0.18, 0.28), vec2(0.0, 0.04)) - 0.026);
        d = min(d, sdSegment(p, vec2(0.18, 0.28), vec2(0.0, 0.04)) - 0.030);
        d = min(d, sdSegment(p, vec2(0.0, 0.04), vec2(-0.12, -0.32)) - 0.026);
        d = min(d, sdRhombus(p - vec2(-0.12, -0.32), vec2(0.08, 0.08)));
    } else if (id == 36) {
        // Fraktur 'Z'
        d = min(d, sdSegment(p, vec2(-0.20, 0.28), vec2(0.20, 0.28)) - 0.026);
        d = min(d, sdSegment(p, vec2(-0.20, -0.28), vec2(0.20, -0.28)) - 0.026);
        d = min(d, sdSegment(p, vec2(0.18, 0.26), vec2(-0.18, -0.26)) - 0.030);
        d = min(d, sdSegment(p, vec2(-0.10, 0.0), vec2(0.10, 0.0)) - 0.022);

    // --- Greek Epigraphic Typography (IDs 37..46) ---
    } else if (id == 37) {
        // Greek Omega (Ω)
        vec2 op = p - vec2(0.0, 0.08);
        float arch = max(sdRing(op, 0.22, 0.024), op.y + 0.10);
        d = min(d, arch);
        d = min(d, sdSegment(p, vec2(-0.18, -0.02), vec2(-0.30, -0.02)) - 0.022);
        d = min(d, sdSegment(p, vec2(0.18, -0.02), vec2(0.30, -0.02)) - 0.022);
    } else if (id == 38) {
        // Greek Psi (Ψ)
        d = min(d, sdSegment(p, vec2(0.0, -0.34), vec2(0.0, 0.34)) - 0.024);
        vec2 pp = p - vec2(0.0, 0.08);
        float cradle = max(sdRing(pp, 0.18, 0.022), -pp.y);
        d = min(d, cradle);
        d = min(d, sdSegment(p, vec2(-0.18, 0.08), vec2(-0.18, 0.24)) - 0.020);
        d = min(d, sdSegment(p, vec2(0.18, 0.08), vec2(0.18, 0.24)) - 0.020);
    } else if (id == 39) {
        // Greek Phi (Φ)
        d = min(d, sdRing(p, 0.20, 0.024));
        d = min(d, sdSegment(p, vec2(0.0, -0.36), vec2(0.0, 0.36)) - 0.024);
    } else if (id == 40) {
        // Greek Theta (Θ)
        d = min(d, sdRing(p, 0.24, 0.024));
        d = min(d, sdSegment(p, vec2(-0.24, 0.0), vec2(0.24, 0.0)) - 0.022);
    } else if (id == 41) {
        // Greek Sigma (Σ)
        d = min(d, sdSegment(p, vec2(-0.18, 0.28), vec2(0.18, 0.28)) - 0.024);
        d = min(d, sdSegment(p, vec2(-0.18, -0.28), vec2(0.18, -0.28)) - 0.024);
        d = min(d, sdSegment(p, vec2(0.18, 0.26), vec2(-0.12, 0.0)) - 0.024);
        d = min(d, sdSegment(p, vec2(-0.12, 0.0), vec2(0.18, -0.26)) - 0.024);
    } else if (id == 42) {
        // Greek Lambda (Λ)
        d = min(d, sdSegment(p, vec2(-0.20, -0.32), vec2(0.0, 0.32)) - 0.024);
        d = min(d, sdSegment(p, vec2(0.20, -0.32), vec2(0.0, 0.32)) - 0.024);
    } else if (id == 43) {
        // Greek Xi (Ξ)
        d = min(d, sdSegment(p, vec2(-0.22, 0.28), vec2(0.22, 0.28)) - 0.024);
        d = min(d, sdSegment(p, vec2(-0.13, 0.0), vec2(0.13, 0.0)) - 0.024);
        d = min(d, sdSegment(p, vec2(-0.22, -0.28), vec2(0.22, -0.28)) - 0.024);
    } else if (id == 44) {
        // Greek Pi (Π)
        d = min(d, sdSegment(p, vec2(-0.24, 0.28), vec2(0.24, 0.28)) - 0.024);
        d = min(d, sdSegment(p, vec2(-0.18, -0.32), vec2(-0.18, 0.28)) - 0.024);
        d = min(d, sdSegment(p, vec2(0.18, -0.32), vec2(0.18, 0.28)) - 0.024);
    } else if (id == 45) {
        // Greek Delta (Δ)
        float tri = max(abs(p.x) * 0.866025 + (p.y - 0.06) * 0.5, -(p.y - 0.06)) - 0.30;
        d = min(d, abs(tri) - 0.024);
    } else if (id == 46) {
        // Greek Gamma (Γ)
        d = min(d, sdSegment(p, vec2(-0.18, -0.32), vec2(-0.18, 0.30)) - 0.024);
        d = min(d, sdSegment(p, vec2(-0.18, 0.30), vec2(0.22, 0.30)) - 0.024);

    // --- Elder Futhark Runes (IDs 47..54) ---
    } else if (id == 47) {
        // Rune Algiz (Protection)
        d = min(d, sdSegment(p, vec2(0.0, -0.34), vec2(0.0, 0.34)) - 0.024);
        d = min(d, sdSegment(p, vec2(0.0, 0.0), vec2(0.22, 0.30)) - 0.022);
        d = min(d, sdSegment(p, vec2(0.0, 0.0), vec2(-0.22, 0.30)) - 0.022);
    } else if (id == 48) {
        // Rune Othila (Heritage)
        vec2 rp = p + vec2(0.0, 0.04);
        d = min(d, abs(sdRhombus(rp, vec2(0.22, 0.20))) - 0.020);
        d = min(d, sdSegment(p, vec2(0.0, -0.16), vec2(0.24, -0.36)) - 0.020);
        d = min(d, sdSegment(p, vec2(0.0, -0.16), vec2(-0.24, -0.36)) - 0.020);
    } else if (id == 49) {
        // Rune Fehu (Wealth)
        d = min(d, sdSegment(p, vec2(-0.12, -0.34), vec2(-0.12, 0.34)) - 0.024);
        d = min(d, sdSegment(p, vec2(-0.12, 0.28), vec2(0.18, 0.34)) - 0.022);
        d = min(d, sdSegment(p, vec2(-0.12, 0.08), vec2(0.18, 0.14)) - 0.022);
    } else if (id == 50) {
        // Rune Tiwaz (Sky God)
        d = min(d, sdSegment(p, vec2(0.0, -0.34), vec2(0.0, 0.34)) - 0.024);
        d = min(d, sdSegment(p, vec2(0.0, 0.34), vec2(-0.22, 0.14)) - 0.022);
        d = min(d, sdSegment(p, vec2(0.0, 0.34), vec2(0.22, 0.14)) - 0.022);
    } else if (id == 51) {
        // Rune Uruz (Strength)
        d = min(d, sdSegment(p, vec2(-0.18, -0.34), vec2(-0.18, 0.34)) - 0.024);
        d = min(d, sdSegment(p, vec2(-0.18, 0.34), vec2(0.18, 0.14)) - 0.022);
        d = min(d, sdSegment(p, vec2(0.18, 0.14), vec2(0.18, -0.34)) - 0.024);
    } else if (id == 52) {
        // Rune Thurisaz (Giant / Thorn)
        d = min(d, sdSegment(p, vec2(-0.14, -0.34), vec2(-0.14, 0.34)) - 0.024);
        d = min(d, sdSegment(p, vec2(-0.14, 0.20), vec2(0.14, 0.0)) - 0.022);
        d = min(d, sdSegment(p, vec2(-0.14, -0.20), vec2(0.14, 0.0)) - 0.022);
    } else if (id == 53) {
        // Rune Ansuz (Odin / Inspiration)
        d = min(d, sdSegment(p, vec2(-0.14, -0.34), vec2(-0.14, 0.34)) - 0.024);
        d = min(d, sdSegment(p, vec2(-0.14, 0.30), vec2(0.18, 0.14)) - 0.022);
        d = min(d, sdSegment(p, vec2(-0.14, 0.12), vec2(0.18, -0.04)) - 0.022);
    } else if (id == 54) {
        // Rune Kenaz (Torch / Fire)
        d = min(d, sdSegment(p, vec2(-0.16, -0.34), vec2(-0.16, 0.34)) - 0.024);
        d = min(d, sdSegment(p, vec2(-0.16, 0.0), vec2(0.18, 0.26)) - 0.022);
        d = min(d, sdSegment(p, vec2(-0.16, 0.0), vec2(0.18, -0.26)) - 0.022);

    // --- Cyrillic Epigraphy (IDs 55..58) ---
    } else if (id == 55) {
        // Cyrillic Zhe (Ж)
        d = min(d, sdSegment(p, vec2(0.0, -0.34), vec2(0.0, 0.34)) - 0.024);
        d = min(d, sdSegment(p, vec2(-0.22, 0.30), vec2(0.22, -0.30)) - 0.022);
        d = min(d, sdSegment(p, vec2(-0.22, -0.30), vec2(0.22, 0.30)) - 0.022);
    } else if (id == 56) {
        // Cyrillic Ef (Ф)
        d = min(d, sdSegment(p, vec2(0.0, -0.36), vec2(0.0, 0.36)) - 0.024);
        vec2 pL = p - vec2(-0.10, 0.0);
        float ovalL = sdRing(pL * vec2(1.3, 0.8), 0.18, 0.022);
        vec2 pR = p - vec2(0.10, 0.0);
        float ovalR = sdRing(pR * vec2(1.3, 0.8), 0.18, 0.022);
        d = min(d, min(ovalL, ovalR));
    } else if (id == 57) {
        // Cyrillic Yu (Ю)
        d = min(d, sdSegment(p, vec2(-0.20, -0.34), vec2(-0.20, 0.34)) - 0.024);
        d = min(d, sdSegment(p, vec2(-0.20, 0.0), vec2(0.06, 0.0)) - 0.022);
        vec2 pCirc = p - vec2(0.06, 0.0);
        d = min(d, sdRing(pCirc, 0.18, 0.022));
    } else {
        // Cyrillic De (Д)
        d = min(d, sdSegment(p, vec2(-0.14, 0.28), vec2(0.14, 0.28)) - 0.022);
        d = min(d, sdSegment(p, vec2(-0.14, 0.28), vec2(-0.20, -0.20)) - 0.022);
        d = min(d, sdSegment(p, vec2(0.14, 0.28), vec2(0.20, -0.20)) - 0.022);
        d = min(d, sdSegment(p, vec2(-0.24, -0.20), vec2(0.24, -0.20)) - 0.024);
        d = min(d, sdSegment(p, vec2(-0.20, -0.20), vec2(-0.20, -0.34)) - 0.020);
        d = min(d, sdSegment(p, vec2(0.20, -0.20), vec2(0.20, -0.34)) - 0.020);
    }
    
    return d;
}

// --- Subroutine 3: Esoteric, Mathematical & Alchemical (IDs 59..80) ---
float evalEsotericMathSDF(vec2 p, int id) {
    float d = 1e5;
    
    // --- Hebrew Epigraphy (IDs 59..64) ---
    if (id == 59) {
        // Hebrew Aleph (א)
        d = min(d, sdSegment(p, vec2(-0.22, 0.30), vec2(0.22, -0.30)) - 0.026);
        d = min(d, sdSegment(p, vec2(0.0, 0.08), vec2(0.18, 0.30)) - 0.022);
        d = min(d, sdSegment(p, vec2(-0.18, -0.30), vec2(0.0, -0.08)) - 0.022);
    } else if (id == 60) {
        // Hebrew Bet (ב)
        d = min(d, sdSegment(p, vec2(-0.18, 0.26), vec2(0.20, 0.26)) - 0.024);
        d = min(d, sdSegment(p, vec2(0.20, 0.26), vec2(0.20, -0.28)) - 0.024);
        d = min(d, sdSegment(p, vec2(-0.24, -0.28), vec2(0.24, -0.28)) - 0.024);
    } else if (id == 61) {
        // Hebrew Gimel (ג)
        d = min(d, sdSegment(p, vec2(-0.12, 0.28), vec2(0.12, 0.28)) - 0.024);
        d = min(d, sdSegment(p, vec2(0.12, 0.28), vec2(0.04, -0.28)) - 0.024);
        d = min(d, sdSegment(p, vec2(0.04, -0.10), vec2(-0.16, -0.28)) - 0.022);
    } else if (id == 62) {
        // Hebrew Dalet (ד)
        d = min(d, sdSegment(p, vec2(-0.20, 0.28), vec2(0.24, 0.28)) - 0.024);
        d = min(d, sdSegment(p, vec2(0.18, 0.28), vec2(0.18, -0.30)) - 0.024);
    } else if (id == 63) {
        // Hebrew Shin (ש)
        d = min(d, sdSegment(p, vec2(-0.22, 0.30), vec2(-0.14, -0.24)) - 0.022);
        d = min(d, sdSegment(p, vec2(0.0, 0.30), vec2(0.0, -0.24)) - 0.022);
        d = min(d, sdSegment(p, vec2(0.22, 0.30), vec2(0.14, -0.24)) - 0.022);
        d = min(d, sdSegment(p, vec2(-0.18, -0.24), vec2(0.18, -0.24)) - 0.024);
    } else if (id == 64) {
        // Hebrew Tav (ת)
        d = min(d, sdSegment(p, vec2(-0.20, 0.28), vec2(0.20, 0.28)) - 0.024);
        d = min(d, sdSegment(p, vec2(-0.18, 0.28), vec2(-0.18, -0.28)) - 0.024);
        d = min(d, sdSegment(p, vec2(-0.24, -0.28), vec2(-0.12, -0.28)) - 0.020);
        d = min(d, sdSegment(p, vec2(0.18, 0.28), vec2(0.18, -0.28)) - 0.024);

    // --- Mathematical & Logic Symbols (IDs 65..72) ---
    } else if (id == 65) {
        // Infinity (∞)
        vec2 pL = p - vec2(-0.14, 0.0);
        vec2 pR = p - vec2(0.14, 0.0);
        d = min(sdRing(pL, 0.13, 0.022), sdRing(pR, 0.13, 0.022));
    } else if (id == 66) {
        // Nabla (∇)
        float tri = max(abs(p.x) * 0.866025 - (p.y + 0.06) * 0.5, p.y + 0.06) - 0.30;
        d = min(d, abs(tri) - 0.024);
    } else if (id == 67) {
        // Partial Derivative (∂)
        vec2 pLoop = p - vec2(0.0, -0.10);
        float loop = sdRing(pLoop, 0.16, 0.022);
        d = min(d, loop);
        d = min(d, sdSegment(p, vec2(0.16, -0.10), vec2(0.16, 0.16)) - 0.022);
        vec2 pHook = p - vec2(0.06, 0.16);
        float hook = max(sdRing(pHook, 0.10, 0.022), -pHook.y);
        d = min(d, hook);
    } else if (id == 68) {
        // Contour Integral (∮)
        vec2 pU = p - vec2(0.06, 0.18);
        float top = max(sdRing(pU, 0.12, 0.022), -pU.y);
        vec2 pD = p - vec2(-0.06, -0.18);
        float bot = max(sdRing(pD, 0.12, 0.022), pD.y);
        d = min(d, min(top, bot));
        d = min(d, sdSegment(p, vec2(0.06, 0.18), vec2(-0.06, -0.18)) - 0.022);
        d = min(d, sdRing(p, 0.11, 0.020));
    } else if (id == 69) {
        // Element Of (∈)
        float ring = sdRing(p, 0.20, 0.022);
        d = min(d, max(ring, p.x - 0.04));
        d = min(d, sdSegment(p, vec2(-0.16, 0.0), vec2(0.16, 0.0)) - 0.022);
    } else if (id == 70) {
        // For All (∀)
        d = min(d, sdSegment(p, vec2(-0.20, 0.30), vec2(0.0, -0.32)) - 0.024);
        d = min(d, sdSegment(p, vec2(0.20, 0.30), vec2(0.0, -0.32)) - 0.024);
        d = min(d, sdSegment(p, vec2(-0.13, 0.04), vec2(0.13, 0.04)) - 0.020);
    } else if (id == 71) {
        // Exists (∃)
        d = min(d, sdSegment(p, vec2(0.16, -0.30), vec2(0.16, 0.30)) - 0.024);
        d = min(d, sdSegment(p, vec2(-0.16, 0.30), vec2(0.16, 0.30)) - 0.022);
        d = min(d, sdSegment(p, vec2(-0.10, 0.0), vec2(0.16, 0.0)) - 0.022);
        d = min(d, sdSegment(p, vec2(-0.16, -0.30), vec2(0.16, -0.30)) - 0.022);
    } else if (id == 72) {
        // Angle (∠)
        d = min(d, sdSegment(p, vec2(-0.20, -0.24), vec2(0.24, -0.24)) - 0.024);
        d = min(d, sdSegment(p, vec2(-0.20, -0.24), vec2(0.18, 0.24)) - 0.024);
        vec2 pA = p - vec2(-0.20, -0.24);
        float arc = max(sdRing(pA, 0.18, 0.016), max(-pA.x, -pA.y));
        d = min(d, arc);

    // --- Planetary & Alchemical Symbols (IDs 73..80) ---
    } else if (id == 73) {
        // Astrological Sun (☉)
        d = min(d, sdRing(p, 0.25, 0.022));
        d = min(d, sdCircle(p, 0.07));
    } else if (id == 74) {
        // Crescent Moon (☽)
        float moon = max(sdCircle(p, 0.26), -sdCircle(p - vec2(0.12, 0.06), 0.24));
        d = min(d, abs(moon) - 0.020);
    } else if (id == 75) {
        // Alchemical Mercury (☿)
        d = min(d, sdRing(p - vec2(0.0, 0.04), 0.15, 0.022));
        d = min(d, sdSegment(p, vec2(0.0, -0.11), vec2(0.0, -0.34)) - 0.020);
        d = min(d, sdSegment(p, vec2(-0.14, -0.22), vec2(0.14, -0.22)) - 0.018);
        vec2 cp = p - vec2(0.0, 0.22);
        float horns = max(sdRing(cp, 0.14, 0.020), -cp.y);
        d = min(d, horns);
    } else if (id == 76) {
        // Jupiter (♃)
        d = min(d, sdSegment(p, vec2(0.10, -0.34), vec2(0.10, 0.32)) - 0.024);
        d = min(d, sdSegment(p, vec2(-0.18, -0.06), vec2(0.24, -0.06)) - 0.022);
        vec2 pC = p - vec2(-0.06, 0.14);
        float arc = max(sdRing(pC, 0.14, 0.022), pC.x);
        d = min(d, arc);
    } else if (id == 77) {
        // Saturn (♄)
        d = min(d, sdSegment(p, vec2(-0.12, 0.0), vec2(-0.12, 0.34)) - 0.024);
        d = min(d, sdSegment(p, vec2(-0.24, 0.22), vec2(0.0, 0.22)) - 0.020);
        vec2 pS = p - vec2(0.06, -0.14);
        float hook = max(sdRing(pS, 0.16, 0.022), -pS.x);
        d = min(d, hook);
    } else if (id == 78) {
        // Mars (♂)
        vec2 pRing = p - vec2(-0.08, -0.08);
        d = min(d, sdRing(pRing, 0.18, 0.022));
        d = min(d, sdSegment(p, vec2(0.04, 0.04), vec2(0.26, 0.26)) - 0.022);
        d = min(d, sdSegment(p, vec2(0.10, 0.26), vec2(0.26, 0.26)) - 0.022);
        d = min(d, sdSegment(p, vec2(0.26, 0.10), vec2(0.26, 0.26)) - 0.022);
    } else if (id == 79) {
        // Venus (♀)
        vec2 pRing = p - vec2(0.0, 0.10);
        d = min(d, sdRing(pRing, 0.18, 0.022));
        d = min(d, sdSegment(p, vec2(0.0, -0.08), vec2(0.0, -0.34)) - 0.022);
        d = min(d, sdSegment(p, vec2(-0.14, -0.22), vec2(0.14, -0.22)) - 0.020);
    } else {
        // Merkaba / Elemental Transmutation (🜂/🜄)
        float triUp = max(abs(p.x) * 0.866025 + (p.y - 0.05) * 0.5, -(p.y - 0.05)) - 0.28;
        float triDown = max(abs(p.x) * 0.866025 - (p.y + 0.05) * 0.5, p.y + 0.05) - 0.28;
        d = min(d, min(abs(triUp) - 0.020, abs(triDown) - 0.020));
        d = min(d, sdSegment(p, vec2(-0.25, 0.0), vec2(0.25, 0.0)) - 0.018);
    }
    
    return d;
}

// --- Subroutine 4: Emojis & Iconic Emblems (IDs 81..107) ---
float evalEmojiIdeogramsSDF(vec2 p, int id) {
    float d = 1e5;
    float r = length(p);
    
    if (id == 81) {
        // Eye (👁️)
        vec2 pUp = p - vec2(0.0, -0.22);
        float lidU = max(sdRing(pUp, 0.38, 0.022), -p.y);
        vec2 pDn = p - vec2(0.0, 0.22);
        float lidD = max(sdRing(pDn, 0.38, 0.022), p.y);
        d = min(d, min(lidU, lidD));
        d = min(d, sdRing(p, 0.12, 0.020));
        d = min(d, sdCircle(p, 0.05));
    } else if (id == 82) {
        // Lightning Bolt (⚡)
        d = min(d, sdSegment(p, vec2(0.08, 0.32), vec2(-0.06, 0.04)) - 0.024);
        d = min(d, sdSegment(p, vec2(-0.06, 0.04), vec2(0.08, 0.04)) - 0.024);
        d = min(d, sdSegment(p, vec2(0.08, 0.04), vec2(-0.10, -0.32)) - 0.024);
    } else if (id == 83) {
        // Crescent Moon (🌙)
        float moon = max(sdCircle(p, 0.28), -sdCircle(p - vec2(0.13, 0.07), 0.25));
        d = min(d, abs(moon) - 0.022);
    } else if (id == 84) {
        // Saturn / Ringed Exoplanet (🪐)
        d = min(d, sdRing(p, 0.16, 0.022));
        vec2 pRing = p * vec2(1.0, 2.8);
        d = min(d, sdRing(pRing, 0.44, 0.024));
    } else if (id == 85) {
        // 5-Pointed Star (⭐)
        float theta = atan(p.y, p.x);
        float a5 = mod(theta + 0.942478, 1.256637) - 0.628319;
        vec2 p5 = vec2(cos(a5), sin(a5)) * r;
        float star = max(p5.x * 0.95 + abs(p5.y) * 2.8 - 0.32, -p5.x);
        d = min(d, abs(star) - 0.022);
    } else if (id == 86) {
        // Skeleton Key (🗝️)
        d = min(d, sdRing(p - vec2(-0.16, 0.16), 0.12, 0.022));
        d = min(d, sdSegment(p, vec2(-0.08, 0.08), vec2(0.24, -0.24)) - 0.022);
        d = min(d, sdSegment(p, vec2(0.14, -0.14), vec2(0.20, -0.08)) - 0.020);
        d = min(d, sdSegment(p, vec2(0.22, -0.22), vec2(0.28, -0.16)) - 0.020);
    } else if (id == 87) {
        // Crossed Swords (⚔️)
        d = min(d, sdSegment(p, vec2(-0.24, -0.24), vec2(0.24, 0.24)) - 0.020);
        d = min(d, sdSegment(p, vec2(-0.10, -0.18), vec2(-0.18, -0.10)) - 0.022);
        d = min(d, sdSegment(p, vec2(0.24, -0.24), vec2(-0.24, 0.24)) - 0.020);
        d = min(d, sdSegment(p, vec2(-0.10, 0.18), vec2(-0.18, 0.10)) - 0.022);
    } else if (id == 88) {
        // Knight's Shield (🛡️)
        d = min(d, sdSegment(p, vec2(-0.22, 0.26), vec2(0.22, 0.26)) - 0.022);
        d = min(d, sdSegment(p, vec2(-0.22, 0.26), vec2(-0.22, 0.02)) - 0.022);
        d = min(d, sdSegment(p, vec2(0.22, 0.26), vec2(0.22, 0.02)) - 0.022);
        d = min(d, sdSegment(p, vec2(-0.22, 0.02), vec2(0.0, -0.32)) - 0.022);
        d = min(d, sdSegment(p, vec2(0.22, 0.02), vec2(0.0, -0.32)) - 0.022);
        d = min(d, sdSegment(p, vec2(0.0, 0.20), vec2(0.0, -0.18)) - 0.018);
        d = min(d, sdSegment(p, vec2(-0.14, 0.08), vec2(0.14, 0.08)) - 0.018);
    } else if (id == 89) {
        // Imperial Crown (👑)
        d = min(d, sdSegment(p, vec2(-0.24, -0.20), vec2(0.24, -0.20)) - 0.024);
        d = min(d, sdSegment(p, vec2(-0.24, -0.20), vec2(-0.22, 0.16)) - 0.022);
        d = min(d, sdSegment(p, vec2(0.24, -0.20), vec2(0.22, 0.16)) - 0.022);
        d = min(d, sdSegment(p, vec2(-0.22, 0.16), vec2(-0.11, -0.04)) - 0.020);
        d = min(d, sdSegment(p, vec2(-0.11, -0.04), vec2(0.0, 0.26)) - 0.020);
        d = min(d, sdSegment(p, vec2(0.0, 0.26), vec2(0.11, -0.04)) - 0.020);
        d = min(d, sdSegment(p, vec2(0.11, -0.04), vec2(0.22, 0.16)) - 0.020);
        d = min(d, sdCircle(p - vec2(0.0, 0.26), 0.04));
        d = min(d, sdCircle(p - vec2(-0.22, 0.16), 0.035));
        d = min(d, sdCircle(p - vec2(0.22, 0.16), 0.035));
    } else if (id == 90) {
        // Brilliant Diamond (💎)
        d = min(d, sdSegment(p, vec2(-0.15, 0.25), vec2(0.15, 0.25)) - 0.022);
        d = min(d, sdSegment(p, vec2(-0.15, 0.25), vec2(-0.24, 0.10)) - 0.022);
        d = min(d, sdSegment(p, vec2(0.15, 0.25), vec2(0.24, 0.10)) - 0.022);
        d = min(d, sdSegment(p, vec2(-0.24, 0.10), vec2(0.24, 0.10)) - 0.020);
        d = min(d, sdSegment(p, vec2(-0.24, 0.10), vec2(0.0, -0.28)) - 0.022);
        d = min(d, sdSegment(p, vec2(0.24, 0.10), vec2(0.0, -0.28)) - 0.022);
        d = min(d, sdSegment(p, vec2(-0.08, 0.10), vec2(0.0, -0.28)) - 0.016);
        d = min(d, sdSegment(p, vec2(0.08, 0.10), vec2(0.0, -0.28)) - 0.016);
    } else if (id == 91) {
        // Hourglass (⌛)
        d = min(d, sdSegment(p, vec2(-0.20, 0.28), vec2(0.20, 0.28)) - 0.024);
        d = min(d, sdSegment(p, vec2(-0.20, -0.28), vec2(0.20, -0.28)) - 0.024);
        d = min(d, sdSegment(p, vec2(-0.18, 0.26), vec2(0.18, -0.26)) - 0.020);
        d = min(d, sdSegment(p, vec2(0.18, 0.26), vec2(-0.18, -0.26)) - 0.020);
        d = min(d, sdSegment(p, vec2(-0.20, -0.28), vec2(-0.20, 0.28)) - 0.018);
        d = min(d, sdSegment(p, vec2(0.20, -0.28), vec2(0.20, 0.28)) - 0.018);
    } else if (id == 92) {
        // Nautical Anchor (⚓)
        d = min(d, sdRing(p - vec2(0.0, 0.24), 0.08, 0.020));
        d = min(d, sdSegment(p, vec2(0.0, 0.16), vec2(0.0, -0.24)) - 0.022);
        d = min(d, sdSegment(p, vec2(-0.16, 0.14), vec2(0.16, 0.14)) - 0.020);
        vec2 pF = p - vec2(0.0, -0.06);
        float fluke = max(sdRing(pF, 0.22, 0.022), -pF.y);
        d = min(d, fluke);
        d = min(d, sdSegment(p, vec2(-0.22, -0.06), vec2(-0.18, 0.02)) - 0.018);
        d = min(d, sdSegment(p, vec2(0.22, -0.06), vec2(0.18, 0.02)) - 0.018);
    } else if (id == 93) {
        // Precision Cogwheel (⚙️)
        d = min(d, sdRing(p, 0.12, 0.022));
        d = min(d, sdRing(p, 0.22, 0.022));
        float theta = atan(p.y, p.x);
        float teeth = smoothstep(0.4, 0.8, sin(theta * 8.0)) * step(0.20, r) * step(r, 0.32);
        d = min(d, abs(r - 0.26) - (teeth * 0.06 + 0.016));
    } else if (id == 94) {
        // Cosmic Spiral (🌀)
        float theta = atan(p.y, p.x);
        float spiral = abs(sin(r * 26.0 - theta * 2.0));
        d = min(d, (spiral - 0.18) * 0.035 * step(r, 0.34));
    } else if (id == 95) {
        // Quill Feather (🪶)
        d = min(d, sdSegment(p, vec2(-0.22, -0.30), vec2(0.20, 0.28)) - 0.018);
        vec2 qP = p;
        float rotP = qP.x - qP.y * 0.7;
        float vane = max(abs(rotP) - 0.10 * (0.34 - abs(p.y)), abs(p.y) - 0.26);
        d = min(d, abs(vane) - 0.018);
    } else if (id == 96) {
        // Candle Flame (🕯️)
        d = min(d, sdSegment(p, vec2(0.0, -0.28), vec2(0.0, -0.08)) - 0.022);
        vec2 fP = p - vec2(0.0, 0.08);
        float flame = length(fP * vec2(1.3, 0.85)) - 0.18;
        d = min(d, abs(flame) - 0.020);
        d = min(d, sdCircle(p - vec2(0.0, 0.08), 0.05));
    } else if (id == 97) {
        // Archer's Bow & Arrow (🏹)
        vec2 bP = p - vec2(-0.10, 0.0);
        float bow = max(sdRing(bP, 0.28, 0.022), bP.x + 0.02);
        d = min(d, bow);
        d = min(d, sdSegment(p, vec2(-0.08, 0.26), vec2(-0.08, -0.26)) - 0.016);
        d = min(d, sdSegment(p, vec2(-0.18, 0.0), vec2(0.24, 0.0)) - 0.020);
        d = min(d, sdSegment(p, vec2(0.24, 0.0), vec2(0.14, 0.08)) - 0.018);
        d = min(d, sdSegment(p, vec2(0.24, 0.0), vec2(0.14, -0.08)) - 0.018);
    } else if (id == 98) {
        // Poseidon's Trident (🔱)
        d = min(d, sdSegment(p, vec2(0.0, -0.34), vec2(0.0, 0.34)) - 0.024);
        vec2 pC = p - vec2(0.0, 0.08);
        float fork = max(sdRing(pC, 0.18, 0.022), -pC.y);
        d = min(d, fork);
        d = min(d, sdSegment(p, vec2(-0.18, 0.08), vec2(-0.18, 0.28)) - 0.020);
        d = min(d, sdSegment(p, vec2(0.18, 0.08), vec2(0.18, 0.28)) - 0.020);
    } else if (id == 99) {
        // Sacred Heart (❤️)
        vec2 hp = p - vec2(0.0, 0.06);
        float l1 = length(hp - vec2(-0.11, 0.06)) - 0.14;
        float l2 = length(hp - vec2(0.11, 0.06)) - 0.14;
        float tip = max(abs(hp.x) * 0.95 + hp.y * 0.8 - 0.02, -hp.y - 0.28);
        d = min(d, abs(min(min(l1, l2), tip)) - 0.022);
    } else if (id == 100) {
        // Memento Mori / Skull (💀)
        vec2 cP = p - vec2(0.0, 0.08);
        float skullTop = max(sdRing(cP, 0.20, 0.022), -cP.y + 0.02);
        d = min(d, skullTop);
        d = min(d, abs(sdBox(p - vec2(0.0, -0.16), vec2(0.11, 0.07))) - 0.018);
        d = min(d, sdCircle(p - vec2(-0.08, 0.04), 0.05));
        d = min(d, sdCircle(p - vec2(0.08, 0.04), 0.05));
    } else if (id == 101) {
        // Sacred Elemental Fire (🔥)
        vec2 fp = p;
        float fMid = length(fp * vec2(1.2, 0.7) - vec2(0.0, 0.08)) - 0.22;
        float fL = length((fp - vec2(-0.12, -0.06)) * vec2(1.4, 0.9)) - 0.14;
        float fR = length((fp - vec2(0.12, -0.06)) * vec2(1.4, 0.9)) - 0.14;
        d = min(d, abs(min(fMid, min(fL, fR))) - 0.022);
    } else if (id == 102) {
        // Sprouting Seed of Life (🌱)
        d = min(d, sdSegment(p, vec2(0.0, -0.30), vec2(0.0, 0.08)) - 0.022);
        vec2 lL = p - vec2(-0.12, 0.14);
        float leafL = length(lL * vec2(1.0, 1.6)) - 0.12;
        vec2 lR = p - vec2(0.12, 0.18);
        float leafR = length(lR * vec2(1.0, 1.6)) - 0.12;
        d = min(d, abs(min(leafL, leafR)) - 0.020);
    } else if (id == 103) {
        // Scales of Justice (⚖️)
        d = min(d, sdSegment(p, vec2(0.0, -0.32), vec2(0.0, 0.26)) - 0.024);
        d = min(d, sdSegment(p, vec2(-0.24, 0.22), vec2(0.24, 0.22)) - 0.022);
        d = min(d, sdSegment(p, vec2(-0.22, 0.22), vec2(-0.22, 0.02)) - 0.016);
        d = min(d, sdSegment(p, vec2(0.22, 0.22), vec2(0.22, 0.02)) - 0.016);
        vec2 pPanL = p - vec2(-0.22, 0.02);
        d = min(d, max(sdRing(pPanL, 0.09, 0.018), -pPanL.y));
        vec2 pPanR = p - vec2(0.22, 0.02);
        d = min(d, max(sdRing(pPanR, 0.09, 0.018), -pPanR.y));
    } else if (id == 104) {
        // Compass Rose (🧭)
        d = min(d, sdRing(p, 0.26, 0.020));
        d = min(d, abs(sdRhombus(p, vec2(0.30, 0.07))) - 0.018);
        d = min(d, abs(sdRhombus(p, vec2(0.07, 0.30))) - 0.018);
        d = min(d, sdCircle(p, 0.04));
    } else if (id == 105) {
        // Divination Crystal Orb (🔮)
        d = min(d, sdRing(p - vec2(0.0, 0.06), 0.20, 0.022));
        d = min(d, sdSegment(p, vec2(-0.18, -0.26), vec2(0.18, -0.26)) - 0.022);
        d = min(d, sdSegment(p, vec2(-0.12, -0.14), vec2(-0.16, -0.26)) - 0.020);
        d = min(d, sdSegment(p, vec2(0.12, -0.14), vec2(0.16, -0.26)) - 0.020);
    } else if (id == 106) {
        // Shinto Torii Gate (⛩️)
        d = min(d, sdSegment(p, vec2(-0.26, 0.24), vec2(0.26, 0.24)) - 0.024);
        d = min(d, sdSegment(p, vec2(-0.20, 0.12), vec2(0.20, 0.12)) - 0.020);
        d = min(d, sdSegment(p, vec2(-0.14, -0.30), vec2(-0.14, 0.24)) - 0.022);
        d = min(d, sdSegment(p, vec2(0.14, -0.30), vec2(0.14, 0.24)) - 0.022);
    } else {
        // DNA Double Helix (🧬)
        float strand1 = abs(p.x - sin(p.y * 14.0) * 0.16) - 0.020;
        float strand2 = abs(p.x + sin(p.y * 14.0) * 0.16) - 0.020;
        d = min(d, min(strand1, strand2));
        float rungs = abs(fract(p.y * 7.0 + 0.5) - 0.5) * 0.4;
        d = min(d, max(rungs - 0.016, abs(p.x) - 0.14));
    }
    
    return d;
}

// --- Procedural Library of Diverse Glyphs, Runes, Multi-Font Characters & Emojis ---
// 108 distinct procedural signed distance field (SDF) glyphs (IDs 0..107)
float evalGlyphSDF(vec2 p, int id) {
    if (id < 29) return evalSerifSansSDF(p, id);
    if (id < 59) return evalHistoricScriptsSDF(p, id);
    if (id < 81) return evalEsotericMathSDF(p, id);
    return evalEmojiIdeogramsSDF(p, id);
}

// --- Procedural Vector Holographic Emblems & Security Logomarks ---
// Returns vec2(channelA, channelB) for multi-angle kinetic color-shifting
vec2 evalStickerEmblem(vec2 q, int shape) {
    vec2 emblem = vec2(0.0);
    float r = length(q);
    float theta = atan(q.y, q.x);
    vec2 aq = abs(q);
    
    if (shape == 0) {
        // --- Shape 0: Authenticity Guilloche Rosette & 8-Point Faceted Star ---
        // Channel A: Concentric outer rims, micro-bead security ring, and dual guilloche ribbons
        float ring1 = smoothstep(0.018, 0.0, abs(r - 0.88));
        float beads = smoothstep(0.020, 0.0, abs(r - 0.82)) * step(0.1, sin(theta * 40.0));
        float ring2 = smoothstep(0.016, 0.0, abs(r - 0.74));
        
        // Multi-wave Guilloche spirograph ribbon
        float gR1 = 0.56 + 0.11 * sin(8.0 * theta + 1.6 * sin(16.0 * theta));
        float gR2 = 0.56 + 0.11 * cos(8.0 * theta - 1.6 * sin(16.0 * theta));
        float gLine1 = smoothstep(0.020, 0.0, abs(r - gR1));
        float gLine2 = smoothstep(0.020, 0.0, abs(r - gR2));
        float guilloche = max(gLine1, gLine2);
        
        emblem.x = max(max(ring1, ring2), max(beads, guilloche));
        
        // Channel B: Inner seal border, 8-point faceted diamond star & core circumpunct
        float sealRing = smoothstep(0.018, 0.0, abs(r - 0.38));
        float sealTeeth = smoothstep(0.016, 0.0, abs(r - 0.35)) * step(0.3, sin(theta * 24.0));
        
        // 8-Fold symmetry folding for faceted star
        float a8 = mod(theta + 0.392699, 0.785398) - 0.392699;
        vec2 p8 = vec2(cos(a8), sin(a8)) * r;
        float starDist = max(p8.x * 0.95 + abs(p8.y) * 2.2 - 0.34, -p8.x);
        float starBody = smoothstep(0.016, 0.0, starDist);
        float starFacet = smoothstep(0.014, 0.0, abs(p8.y)) * step(0.0, p8.x) * step(p8.x, 0.32);
        float coreDot = smoothstep(0.020, 0.0, abs(r - 0.08)) + smoothstep(0.05, 0.0, r);
        
        emblem.y = max(max(sealRing, sealTeeth), max(starBody, max(starFacet, coreDot)));
        
    } else if (shape == 1) {
        // --- Shape 1: Cybernetic IC Processor Die & PCB Circuit Bus ---
        // Channel A: Outer double security border, corner L-reticles, micro-barcode, and circuit bus
        float f1 = smoothstep(0.018, 0.0, abs(max(aq.x - 1.02, aq.y - 0.62)));
        float f2 = smoothstep(0.015, 0.0, abs(max(aq.x - 0.92, aq.y - 0.54)));
        
        // Corner optical reticles
        vec2 cRet = abs(aq - vec2(0.97, 0.58));
        float reticle = (smoothstep(0.014, 0.0, cRet.x) * step(cRet.y, 0.08)) +
                        (smoothstep(0.014, 0.0, cRet.y) * step(cRet.x, 0.08));
                        
        // Top and bottom security barcode stripes
        float barcode = (aq.y > 0.54 && aq.y < 0.62) ? step(0.35, sin(q.x * 55.0)) : 0.0;
        
        // Orthogonal PCB bus lines with 45-degree bends
        float traceH1 = smoothstep(0.014, 0.0, abs(aq.y - 0.12)) * step(0.32, aq.x) * step(aq.x, 0.78);
        float traceH2 = smoothstep(0.014, 0.0, abs(aq.y - 0.20)) * step(0.32, aq.x) * step(aq.x, 0.68);
        float traceDiag = smoothstep(0.014, 0.0, abs((aq.x - 0.68) - (aq.y - 0.20))) * step(0.68, aq.x) * step(aq.x, 0.78);
        float traceV1 = smoothstep(0.014, 0.0, abs(aq.x - 0.12)) * step(0.28, aq.y) * step(aq.y, 0.48);
        float traceV2 = smoothstep(0.014, 0.0, abs(aq.x - 0.22)) * step(0.28, aq.y) * step(aq.y, 0.44);
        
        // Via termination pads
        float via1 = smoothstep(0.016, 0.0, abs(length(aq - vec2(0.78, 0.12)) - 0.030));
        float via2 = smoothstep(0.016, 0.0, abs(length(aq - vec2(0.78, 0.30)) - 0.030));
        float via3 = smoothstep(0.016, 0.0, abs(length(aq - vec2(0.12, 0.48)) - 0.030));
        float via4 = smoothstep(0.016, 0.0, abs(length(aq - vec2(0.22, 0.44)) - 0.030));
        float vias = max(max(via1, via2), max(via3, via4));
        
        emblem.x = max(max(max(f1, f2), reticle), max(barcode, max(max(traceH1, traceH2), max(traceDiag, max(max(traceV1, traceV2), vias)))));
        
        // Channel B: Silicon Processor Die, stepped square rings, and core emblem
        float dieBox = smoothstep(0.016, 0.0, abs(max(aq.x - 0.30, aq.y - 0.26)));
        float dieR = max(aq.x, aq.y);
        float dieRings = (dieR < 0.26) ? smoothstep(0.014, 0.0, abs(fract(dieR * 14.0) - 0.5) - 0.12) : 0.0;
        float chipLogo = smoothstep(0.016, 0.0, abs(aq.x + aq.y - 0.10));
        float chipCore = smoothstep(0.045, 0.0, length(q));
        
        emblem.y = max(max(dieBox, dieRings), max(chipLogo, chipCore));
        
    } else if (shape == 2) {
        // --- Shape 2: Sacred Metatron Mandala & Alchemical Hexagram ---
        // Channel A: Concentric hex borders, perimeter ticks, 6 radial spokes, and 6 orbital circles
        float hexD = max(aq.x * 0.866025 + aq.y * 0.5, aq.y);
        float hBorder1 = smoothstep(0.018, 0.0, abs(hexD - 0.88));
        float hBorder2 = smoothstep(0.015, 0.0, abs(hexD - 0.78));
        float ticks = (hexD > 0.78 && hexD < 0.88) ? step(0.4, sin(theta * 36.0)) : 0.0;
        float spoke6 = smoothstep(0.016, 0.0, abs(sin(theta * 3.0)) * r) * step(r, 0.88);
        
        // 6 Orbital Flower of Life circles
        float a6 = mod(theta + 0.523599, 1.047198) - 0.523599;
        vec2 p6 = vec2(cos(a6), sin(a6)) * r;
        float folCircle = smoothstep(0.018, 0.0, abs(length(p6 - vec2(0.36, 0.0)) - 0.36));
        
        emblem.x = max(max(hBorder1, hBorder2), max(ticks, max(spoke6, folCircle)));
        
        // Channel B: Interlocking Merkaba triangles, central sacred circle, and core node
        vec2 pUp = q - vec2(0.0, -0.06);
        float triUp = max(abs(pUp.x) * 0.866025 + pUp.y * 0.5, -pUp.y) - 0.36;
        vec2 pDown = q - vec2(0.0, 0.06);
        float triDown = max(abs(pDown.x) * 0.866025 - pDown.y * 0.5, pDown.y) - 0.36;
        float hexagram = max(smoothstep(0.020, 0.0, abs(triUp)), smoothstep(0.020, 0.0, abs(triDown)));
        
        float innerCirc = smoothstep(0.016, 0.0, abs(r - 0.25));
        float coreNode = smoothstep(0.018, 0.0, abs(r - 0.09)) + smoothstep(0.05, 0.0, r);
        
        emblem.y = max(hexagram, max(innerCirc, coreNode));
        
    } else if (shape == 3) {
        // --- Shape 3: Imperial Starburst Medallion & Heraldic Shield ---
        // Channel A: 16 radiating sunburst wedge beams, notched outer rim, and mid ring
        float rayWedge = (r > 0.42 && r < 0.86) ? smoothstep(0.12, 0.65, abs(sin(theta * 8.0))) : 0.0;
        float cogRim = smoothstep(0.018, 0.0, abs(r - 0.84));
        float cogTeeth = (abs(r - 0.86) < 0.022) ? step(0.2, sin(theta * 32.0)) : 0.0;
        float midRing = smoothstep(0.016, 0.0, abs(r - 0.42));
        
        emblem.x = max(max(cogRim, cogTeeth), max(rayWedge, midRing));
        
        // Channel B: Heraldic diamond shield, royal cross, corner fleurons, and crest jewel
        float shield = smoothstep(0.018, 0.0, abs(aq.x + aq.y - 0.32));
        float shieldInner = smoothstep(0.015, 0.0, abs(aq.x + aq.y - 0.26));
        float crossArmH = smoothstep(0.016, 0.0, aq.y - 0.035) * step(aq.x, 0.22);
        float crossArmV = smoothstep(0.016, 0.0, aq.x - 0.035) * step(aq.y, 0.22);
        float crossMark = max(crossArmH, crossArmV);
        
        float fleuron = smoothstep(0.038, 0.0, length(aq - vec2(0.12, 0.12)) - 0.02);
        float crestJewel = smoothstep(0.018, 0.0, abs(r - 0.06)) + smoothstep(0.045, 0.0, r);
        
        emblem.y = max(max(shield, shieldInner), max(crossMark, max(fleuron, crestJewel)));
        
    } else if (shape == 4) {
        // --- Shape 4: Diamond Lozenge & Eye of Providence ---
        // Channel A: Dual concentric diamond security rims, 12 radiating pyramidal sunbeam rays
        float rhD = aq.x * 0.85 + aq.y * 1.15;
        float rhBorder1 = smoothstep(0.018, 0.0, abs(rhD - 0.88));
        float rhBorder2 = smoothstep(0.015, 0.0, abs(rhD - 0.78));
        float rhTicks = (abs(rhD - 0.83) < 0.045) ? step(0.3, sin(theta * 32.0)) : 0.0;
        float sunRays = (r > 0.30 && r < 0.76) ? smoothstep(0.14, 0.65, abs(sin(theta * 12.0))) : 0.0;
        
        emblem.x = max(max(rhBorder1, rhBorder2), max(rhTicks, sunRays));
        
        // Channel B: Stepped Masonic pyramid platform, almond sacred eye, and radiant pupil
        float pY = q.y + 0.14;
        float pyrBase = smoothstep(0.016, 0.0, abs(max(aq.x * 1.15 + pY * 0.82 - 0.32, -pY)));
        float pyrSteps = (pyrBase > 0.2 && pY > 0.0) ? step(0.45, sin(pY * 42.0)) : 0.0;
        
        float eyeUpper = smoothstep(0.018, 0.0, abs(length(q - vec2(0.0, -0.16)) - 0.32)) * step(abs(q.x), 0.26);
        float eyeLower = smoothstep(0.018, 0.0, abs(length(q - vec2(0.0, 0.16)) - 0.32)) * step(abs(q.x), 0.26);
        float eyeIris = smoothstep(0.016, 0.0, abs(r - 0.10));
        float eyePupil = smoothstep(0.05, 0.0, r);
        
        emblem.y = max(max(pyrBase, pyrSteps), max(max(eyeUpper, eyeLower), max(eyeIris, eyePupil)));
        
    } else if (shape == 5) {
        // --- Shape 5: Sacred Gothic Archway Portal & Tree of Life ---
        // Channel A: Twin Corinthian portal pillars, gothic pointed arch ribs, celestial starfield
        float pillarL = smoothstep(0.016, 0.0, abs(q.x + 0.52)) * step(q.y, 0.25) * step(-0.75, q.y);
        float pillarR = smoothstep(0.016, 0.0, abs(q.x - 0.52)) * step(q.y, 0.25) * step(-0.75, q.y);
        float archRib = smoothstep(0.018, 0.0, abs(length(vec2(aq.x - 0.22, max(0.0, q.y - 0.20))) - 0.54));
        float archStars = (q.y > 0.12 && r < 0.65) ? step(0.70, sin(q.x * 38.0) * sin(q.y * 38.0)) * 0.8 : 0.0;
        
        emblem.x = max(max(pillarL, pillarR), max(archRib, archStars));
        
        // Channel B: Tree of Life / Kabbalistic Sephirah nodes and energy conduits
        float trunk = smoothstep(0.016, 0.0, abs(q.x)) * step(abs(q.y), 0.52);
        float conduits = smoothstep(0.016, 0.0, abs(abs(q.x) - abs(q.y + 0.08))) * step(r, 0.46);
        float nodeCrown = smoothstep(0.016, 0.0, abs(length(q - vec2(0.0, 0.40)) - 0.055));
        float nodeHeart = smoothstep(0.016, 0.0, abs(length(q) - 0.065)) + smoothstep(0.04, 0.0, length(q));
        float nodeBase = smoothstep(0.016, 0.0, abs(length(q - vec2(0.0, -0.40)) - 0.055));
        float nodeSides = smoothstep(0.016, 0.0, abs(length(aq - vec2(0.26, 0.18)) - 0.050));
        
        emblem.y = max(max(trunk, conduits), max(max(nodeCrown, nodeHeart), max(nodeBase, nodeSides)));
        
    } else if (shape == 6) {
        // --- Shape 6: Cyberspace Chamfered Octagon & Quantum Biohazard Reactor ---
        // Channel A: Dual octagonal hazard border, perimeter caution chevrons, corner reticles
        float octD = max(max(aq.x, aq.y), (aq.x + aq.y) * 0.707107);
        float octRim1 = smoothstep(0.018, 0.0, abs(octD - 0.86));
        float octRim2 = smoothstep(0.015, 0.0, abs(octD - 0.76));
        float chevrons = (octD > 0.76 && octD < 0.86) ? step(0.35, sin((q.x + q.y) * 44.0)) : 0.0;
        
        emblem.x = max(max(octRim1, octRim2), chevrons);
        
        // Channel B: Tri-sector ionizing radiation blades, collider ring, and quantum core
        float a3 = mod(theta + 1.047198, 2.094395) - 1.047198;
        float blades = (r > 0.22 && r < 0.64) ? smoothstep(0.02, 0.12, abs(a3)) * step(abs(a3), 0.50) : 0.0;
        float collider = smoothstep(0.016, 0.0, abs(r - 0.20));
        float qCore = smoothstep(0.018, 0.0, abs(r - 0.07)) + smoothstep(0.045, 0.0, r);
        
        emblem.y = max(blades, max(collider, qCore));
        
    } else {
        // --- Shape 7: 12-Pointed Solar Medallion & Celestial Astrolabe ---
        // Channel A: 12 perimeter solar flare cusps, 24 astrolabe hour ticks, zodiac rim
        float a12 = mod(theta + 0.261799, 0.523599) - 0.261799;
        float solRing = smoothstep(0.018, 0.0, abs(r - (0.76 + cos(a12 * 6.0) * 0.08)));
        float astroTicks = (r > 0.64 && r < 0.73) ? step(0.3, sin(theta * 24.0)) : 0.0;
        float zodiacRim = smoothstep(0.016, 0.0, abs(r - 0.64));
        
        emblem.x = max(solRing, max(astroTicks, zodiacRim));
        
        // Channel B: Armillary sphere rings, 4-point cardinal compass rose, central polar star
        float equator = smoothstep(0.016, 0.0, abs(r - 0.44));
        float cArmH = max(aq.y * 3.4 + abs(aq.x - 0.20) * 1.2 - 0.24, -aq.x) * step(aq.x, 0.38);
        float cArmV = max(aq.x * 3.4 + abs(aq.y - 0.20) * 1.2 - 0.24, -aq.y) * step(aq.y, 0.38);
        float compass = max(smoothstep(0.016, 0.0, cArmH), smoothstep(0.016, 0.0, cArmV));
        float polarStar = smoothstep(0.018, 0.0, abs(r - 0.08)) + smoothstep(0.045, 0.0, r);
        
        emblem.y = max(equator, max(compass, polarStar));
    }
    
    return clamp(emblem, 0.0, 1.0);
}

// --- Craft-Authentic Artisanal Medallion Emblem Libraries (24 Designs across 4 Media) ---
// Returns vec2(border/frame channel, central motif channel).
// sealStyle 0: Holographic Stickers (8 designs in evalStickerEmblem)
// sealStyle 1: Crimson Cinnabar Wax / Rakkan Seals (6 designs)
// sealStyle 2: Flush Metal / Maki-e / Pietra Dura Inlays (6 designs)
// sealStyle 3: Luthier Mother-of-Pearl & Abalone Rosettes (6 designs)
// sealStyle 4: Hot-Iron Pyrography Wood Brands (6 designs)
vec2 evalArtisanalEmblem(vec2 q, int sealStyle, int shape) {
    if (sealStyle == 0) return evalStickerEmblem(q, shape);

    int dIdx = int(mod(float(shape), 6.0));
    float r = length(q);
    float theta = atan(q.y, q.x);
    vec2 aq = abs(q);
    vec2 emb = vec2(0.0);

    if (sealStyle == 1) {
        // === STYLE 1: Crimson Cinnabar Wax / Rakkan Seals (6 Designs) ===
        if (dIdx == 0) {
            // 0: Imperial Square Chop (archaic labyrinthine tensho seal-script grid)
            float frame = smoothstep(0.025, 0.0, abs(max(aq.x, aq.y) - 0.78));
            float inner = smoothstep(0.022, 0.0, abs(max(aq.x, aq.y) - 0.64));
            float vBars = smoothstep(0.032, 0.0, abs(fract(q.x * 2.6 + 0.5) - 0.5) * 0.38) * step(max(aq.x, aq.y), 0.58);
            float hBars = smoothstep(0.032, 0.0, abs(fract(q.y * 2.6 + 0.5) - 0.5) * 0.38) * step(max(aq.x, aq.y), 0.58);
            float breakMask = step(0.38, hash12(floor(q * 2.6) * 19.3 + vec2(3.1, 7.7)));
            emb.x = max(frame, inner);
            emb.y = max(vBars * breakMask, hBars * (1.0 - breakMask));
        } else if (dIdx == 1) {
            // 1: 8-Petal Blooming Lotus Crest
            float rim = smoothstep(0.024, 0.0, abs(r - 0.78));
            float a8 = mod(theta + 0.3927, 0.7854) - 0.3927;
            float petal = smoothstep(0.028, 0.0, abs(r - (0.34 + 0.32 * cos(a8 * 2.4)))) * step(0.22, r);
            float pod = smoothstep(0.022, 0.0, abs(r - 0.20)) + smoothstep(0.06, 0.0, r);
            emb.x = rim;
            emb.y = max(petal, pod);
        } else if (dIdx == 2) {
            // 2: Auspicious Endless Knot (Pan Chang geometric weave)
            float rim = smoothstep(0.024, 0.0, abs(r - 0.80));
            vec2 p45 = vec2(q.x - q.y, q.x + q.y) * 0.707107;
            vec2 ap = abs(p45);
            float k1 = smoothstep(0.028, 0.0, abs(sdBox(p45, vec2(0.46, 0.22))));
            float k2 = smoothstep(0.028, 0.0, abs(sdBox(p45, vec2(0.22, 0.46))));
            float k3 = smoothstep(0.026, 0.0, abs(max(ap.x, ap.y) - 0.14));
            emb.x = rim;
            emb.y = max(max(k1, k2), k3);
        } else if (dIdx == 3) {
            // 3: Crescent Moon & Twin Orbital Stars
            float rim = smoothstep(0.024, 0.0, abs(r - 0.80));
            float dots = smoothstep(0.045, 0.0, length(vec2(r - 0.68, sin(theta * 12.0) * 0.06)));
            float moonOut = smoothstep(0.02, 0.0, length(q - vec2(-0.06, 0.0)) - 0.42);
            float moonCut = smoothstep(0.02, 0.0, length(q - vec2(0.14, 0.08)) - 0.36);
            float crescent = clamp(moonOut - moonCut, 0.0, 1.0);
            float star1 = smoothstep(0.07, 0.0, length(q - vec2(0.26, 0.22)));
            float star2 = smoothstep(0.05, 0.0, length(q - vec2(0.34, -0.14)));
            emb.x = max(rim, dots);
            emb.y = max(crescent, max(star1, star2));
        } else if (dIdx == 4) {
            // 4: 16-Petal Imperial Chrysanthemum (Kiku Rosette)
            float rim = smoothstep(0.024, 0.0, abs(r - 0.80));
            float kiku = smoothstep(0.026, 0.0, abs(r - (0.58 + 0.12 * cos(theta * 16.0)))) * step(0.18, r);
            float spokes = smoothstep(0.020, 0.0, abs(sin(theta * 8.0)) * r) * step(0.18, r) * step(r, 0.68);
            float stamen = smoothstep(0.022, 0.0, abs(r - 0.17)) + smoothstep(0.07, 0.0, r);
            emb.x = rim;
            emb.y = max(max(kiku, spokes), stamen);
        } else {
            // 5: Double-Lobed Gourd Stamp enclosing Mountain & Sun
            float topLobe = length(q - vec2(0.0, 0.30)) - 0.32;
            float botLobe = length(q - vec2(0.0, -0.22)) - 0.46;
            float gourdRim = smoothstep(0.028, 0.0, abs(min(topLobe, botLobe)));
            float sun = smoothstep(0.022, 0.0, abs(length(q - vec2(0.0, 0.30)) - 0.14));
            float peak1 = smoothstep(0.026, 0.0, sdSegment(q, vec2(-0.30, -0.34), vec2(0.0, -0.02)));
            float peak2 = smoothstep(0.026, 0.0, sdSegment(q, vec2(0.0, -0.02), vec2(0.30, -0.34)));
            float base = smoothstep(0.024, 0.0, sdSegment(q, vec2(-0.32, -0.34), vec2(0.32, -0.34)));
            emb.x = gourdRim;
            emb.y = max(sun, max(base, max(peak1, peak2)));
        }
    } else if (sealStyle == 2) {
        // === STYLE 2: Flush Metal / Maki-e / Pietra Dura Inlays (6 Designs) ===
        if (dIdx == 0) {
            // 0: Florentine 8-Point Compass Star
            float r1 = smoothstep(0.020, 0.0, abs(r - 0.80));
            float r2 = smoothstep(0.016, 0.0, abs(r - 0.66));
            float a8 = mod(theta + 0.3927, 0.7854) - 0.3927;
            float star = smoothstep(0.022, 0.0, abs(a8) * r - (0.64 - r) * 0.26) * step(r, 0.66);
            float center = smoothstep(0.11, 0.0, r);
            emb.x = max(r1, r2);
            emb.y = max(star, center);
        } else if (dIdx == 1) {
            // 1: Art Deco Stepped Sunburst Fan
            float frame = smoothstep(0.022, 0.0, abs(sdBox(q, vec2(0.76, 0.64))));
            float stepIn = smoothstep(0.018, 0.0, abs(sdBox(q, vec2(0.62, 0.50))));
            float rays = smoothstep(0.024, 0.0, abs(sin(theta * 7.0)) * r) * step(0.16, r) * step(r, 0.56);
            float chev = smoothstep(0.020, 0.0, abs(abs(q.x) + abs(q.y) * 1.15 - 0.42));
            emb.x = max(frame, stepIn);
            emb.y = max(rays, chev);
        } else if (dIdx == 2) {
            // 2: 8-Fold Rub el Hizb Rosette (Interlocking Rotated Squares)
            float rim = smoothstep(0.020, 0.0, abs(r - 0.82));
            float sq1 = smoothstep(0.024, 0.0, abs(max(aq.x, aq.y) - 0.50));
            vec2 p45 = vec2(q.x - q.y, q.x + q.y) * 0.707107;
            float sq2 = smoothstep(0.024, 0.0, abs(max(abs(p45.x), abs(p45.y)) - 0.50));
            float jewel = smoothstep(0.13, 0.0, r);
            emb.x = rim;
            emb.y = max(max(sq1, sq2), jewel);
        } else if (dIdx == 3) {
            // 3: Byzantine Flared Cross & Corner Trefoils
            float rim = smoothstep(0.022, 0.0, abs(r - 0.80));
            float armH = smoothstep(0.022, 0.0, aq.y - (0.06 + aq.x * 0.24)) * step(aq.x, 0.62);
            float armV = smoothstep(0.022, 0.0, aq.x - (0.06 + aq.y * 0.24)) * step(aq.y, 0.62);
            float tref = smoothstep(0.075, 0.0, length(aq - vec2(0.38, 0.38)));
            emb.x = rim;
            emb.y = max(max(armH, armV), tref);
        } else if (dIdx == 4) {
            // 4: Armillary Meridian Astrolabe
            float rim = smoothstep(0.022, 0.0, abs(r - 0.80));
            float e1 = smoothstep(0.020, 0.0, abs(length(vec2(q.x * 1.85, q.y)) - 0.62));
            float e2 = smoothstep(0.020, 0.0, abs(length(vec2(q.x, q.y * 1.85)) - 0.62));
            float axis = smoothstep(0.018, 0.0, sdSegment(q, vec2(-0.55, -0.55), vec2(0.55, 0.55)));
            float core = smoothstep(0.09, 0.0, r);
            emb.x = rim;
            emb.y = max(max(e1, e2), max(axis, core));
        } else {
            // 5: Roman Laurel Medallion & Central Lozenge
            float rim = smoothstep(0.020, 0.0, abs(r - 0.82));
            float leaf = smoothstep(0.028, 0.0, abs(r - 0.64)) * step(0.15, abs(sin(theta * 9.0))) * step(-0.75, q.y);
            float loz = smoothstep(0.022, 0.0, abs(sdRhombus(q, vec2(0.34, 0.46))));
            float dotC = smoothstep(0.08, 0.0, r);
            emb.x = max(rim, leaf);
            emb.y = max(loz, dotC);
        }
    } else if (sealStyle == 3) {
        // === STYLE 3: Luthier Mother-of-Pearl & Abalone Rosettes (6 Designs) ===
        if (dIdx == 0) {
            // 0: Classical Guitar Soundhole Rosette (mosaic purfling + chevron band)
            float pOut = smoothstep(0.018, 0.0, abs(r - 0.82));
            float pIn  = smoothstep(0.018, 0.0, abs(r - 0.46));
            float zig  = smoothstep(0.026, 0.0, abs(r - (0.64 + 0.07 * abs(fract(theta * 3.82) * 2.0 - 1.0))));
            float innerRing = smoothstep(0.018, 0.0, abs(r - 0.34));
            emb.x = max(pOut, pIn);
            emb.y = max(zig, innerRing);
        } else if (dIdx == 1) {
            // 1: Vintage Fretboard Split-Diamond Crown
            float rim = smoothstep(0.020, 0.0, abs(sdRhombus(q, vec2(0.82, 0.62))));
            float dL = smoothstep(0.020, 0.0, sdRhombus(q - vec2(-0.24, 0.0), vec2(0.24, 0.36)));
            float dR = smoothstep(0.020, 0.0, sdRhombus(q - vec2( 0.24, 0.0), vec2(0.24, 0.36)));
            float dC = smoothstep(0.020, 0.0, sdRhombus(q, vec2(0.14, 0.24)));
            emb.x = rim;
            emb.y = max(max(dL, dR), dC);
        } else if (dIdx == 2) {
            // 2: Vine of Life Mirrored Tendril Scroll
            float rim = smoothstep(0.020, 0.0, abs(r - 0.80));
            float vine = smoothstep(0.028, 0.0, abs(q.x - 0.22 * sin(q.y * 5.2))) * step(aq.y, 0.64);
            float leaf1 = smoothstep(0.09, 0.0, length(aq - vec2(0.28, 0.28)));
            float leaf2 = smoothstep(0.08, 0.0, length(aq - vec2(0.26, -0.22)));
            float bud = smoothstep(0.08, 0.0, length(q - vec2(0.0, 0.56)));
            emb.x = rim;
            emb.y = max(vine, max(bud, max(leaf1, leaf2)));
        } else if (dIdx == 3) {
            // 3: Art Nouveau Winged Crest & Abalone Heart
            float rim = smoothstep(0.020, 0.0, abs(r - 0.82));
            float wing1 = smoothstep(0.026, 0.0, abs(length(vec2(aq.x - 0.34, q.y * 1.45 - 0.14)) - 0.32)) * step(0.12, aq.x);
            float wing2 = smoothstep(0.024, 0.0, abs(length(vec2(aq.x - 0.28, q.y * 1.55 + 0.12)) - 0.24)) * step(0.10, aq.x);
            float heart = smoothstep(0.16, 0.0, length(vec2(aq.x, q.y + 0.05 - aq.x * 0.45)));
            emb.x = rim;
            emb.y = max(max(wing1, wing2), heart);
        } else if (dIdx == 4) {
            // 4: Celtic Triquetra 3-Fold Knot
            float rim = smoothstep(0.020, 0.0, abs(r - 0.80));
            float a3 = mod(theta + 1.0472, 2.0944) - 1.0472;
            vec2 q3 = vec2(cos(a3), sin(a3)) * r;
            float arc3 = smoothstep(0.030, 0.0, abs(length(q3 - vec2(0.26, 0.0)) - 0.36)) * step(r, 0.66);
            float cab = smoothstep(0.10, 0.0, r);
            emb.x = rim;
            emb.y = max(arc3, cab);
        } else {
            // 5: Baroque Fleur-de-Lis
            float rim = smoothstep(0.020, 0.0, abs(r - 0.80));
            float centerPetal = smoothstep(0.024, 0.0, length(vec2(aq.x * 2.2, q.y - 0.10)) - 0.38);
            float sidePetal = smoothstep(0.024, 0.0, abs(length(vec2(aq.x - 0.32, q.y - 0.04)) - 0.24)) * step(-0.22, q.y);
            float collar = smoothstep(0.026, 0.0, sdSegment(q, vec2(-0.34, -0.20), vec2(0.34, -0.20)));
            emb.x = rim;
            emb.y = max(centerPetal, max(sidePetal, collar));
        }
    } else {
        // === STYLE 4: Hot-Iron Pyrography Wood Brands (6 Designs) ===
        if (dIdx == 0) {
            // 0: Maritime Anchor & Rope Ring
            float rope = smoothstep(0.032, 0.0, abs(r - 0.78 + 0.025 * sin(theta * 24.0)));
            float shank = smoothstep(0.030, 0.0, sdSegment(q, vec2(0.0, -0.46), vec2(0.0, 0.44)));
            float stock = smoothstep(0.028, 0.0, sdSegment(q, vec2(-0.26, 0.28), vec2(0.26, 0.28)));
            float fluke = smoothstep(0.030, 0.0, abs(length(q - vec2(0.0, -0.08)) - 0.40)) * step(q.y, -0.08);
            float eye = smoothstep(0.024, 0.0, abs(length(q - vec2(0.0, 0.50)) - 0.09));
            emb.x = rope;
            emb.y = max(max(shank, stock), max(fluke, eye));
        } else if (dIdx == 1) {
            // 1: Nordic Vegvisir Wayfinder Staves
            float rim = smoothstep(0.028, 0.0, abs(r - 0.80));
            float a8 = mod(theta + 0.3927, 0.7854) - 0.3927;
            vec2 q8 = vec2(cos(a8), sin(a8)) * r;
            float stave = smoothstep(0.026, 0.0, abs(q8.y)) * step(0.0, q8.x) * step(q8.x, 0.64);
            float crossBar = smoothstep(0.024, 0.0, abs(q8.x - 0.48)) * step(abs(q8.y), 0.14);
            float hub = smoothstep(0.09, 0.0, r);
            emb.x = rim;
            emb.y = max(max(stave, crossBar), hub);
        } else if (dIdx == 2) {
            // 2: Cooperage Barrel Maker's Mark
            float rim = smoothstep(0.030, 0.0, abs(r - 0.78));
            float barT = smoothstep(0.028, 0.0, sdSegment(q, vec2(-0.52, 0.26), vec2(0.52, 0.26)));
            float barB = smoothstep(0.028, 0.0, sdSegment(q, vec2(-0.52, -0.26), vec2(0.52, -0.26)));
            float x1 = smoothstep(0.028, 0.0, sdSegment(q, vec2(-0.34, -0.44), vec2(0.34, 0.44)));
            float x2 = smoothstep(0.028, 0.0, sdSegment(q, vec2(0.34, -0.44), vec2(-0.34, 0.44)));
            emb.x = rim;
            emb.y = max(max(barT, barB), max(x1, x2));
        } else if (dIdx == 3) {
            // 3: Alpine Peaks & Conifer Tree
            float rim = smoothstep(0.028, 0.0, abs(r - 0.80));
            float m1 = smoothstep(0.028, 0.0, sdSegment(q, vec2(-0.54, -0.22), vec2(-0.14, 0.38)));
            float m2 = smoothstep(0.028, 0.0, sdSegment(q, vec2(-0.14, 0.38), vec2(0.24, -0.22)));
            float m3 = smoothstep(0.028, 0.0, sdSegment(q, vec2(0.02, 0.06), vec2(0.28, 0.42)));
            float m4 = smoothstep(0.028, 0.0, sdSegment(q, vec2(0.28, 0.42), vec2(0.56, -0.22)));
            float base = smoothstep(0.028, 0.0, sdSegment(q, vec2(-0.56, -0.22), vec2(0.56, -0.22)));
            float trunk = smoothstep(0.024, 0.0, sdSegment(q, vec2(0.0, -0.54), vec2(0.0, -0.22)));
            emb.x = rim;
            emb.y = max(max(max(m1, m2), max(m3, m4)), max(base, trunk));
        } else if (dIdx == 4) {
            // 4: Blacksmith Guild Shield & Crossed Bars
            float shield = smoothstep(0.030, 0.0, abs(sdBox(q, vec2(0.58, 0.64))));
            float c1 = smoothstep(0.030, 0.0, sdSegment(q, vec2(-0.38, -0.38), vec2(0.38, 0.38)));
            float c2 = smoothstep(0.030, 0.0, sdSegment(q, vec2(0.38, -0.38), vec2(-0.38, 0.38)));
            float anvil = smoothstep(0.028, 0.0, sdBox(q - vec2(0.0, -0.02), vec2(0.24, 0.10)));
            emb.x = shield;
            emb.y = max(anvil, max(c1, c2));
        } else {
            // 5: Solar Disc & Branching Antler Crest
            float rim = smoothstep(0.028, 0.0, abs(r - 0.80));
            float disc = smoothstep(0.028, 0.0, abs(length(q - vec2(0.0, -0.18)) - 0.24));
            float antMain = smoothstep(0.028, 0.0, sdSegment(vec2(aq.x, q.y), vec2(0.14, 0.04), vec2(0.46, 0.48)));
            float antTine1 = smoothstep(0.026, 0.0, sdSegment(vec2(aq.x, q.y), vec2(0.26, 0.20), vec2(0.16, 0.46)));
            float antTine2 = smoothstep(0.026, 0.0, sdSegment(vec2(aq.x, q.y), vec2(0.36, 0.34), vec2(0.52, 0.30)));
            emb.x = rim;
            emb.y = max(disc, max(antMain, max(antTine1, antTine2)));
        }
    }

    return clamp(emb, 0.0, 1.0);
}

// --- Procedural Persistent Medallions, Wax Seals, Inlays & Holographic Stickers ---
struct StickerData {
    float dist;
    vec2  local;
    vec2  cell;
    int   shape;
    int   sealStyle;
    float angle;
    float radius;
    float intensity;
};

vec4 getStickerSlot(int i) {
    if (i == 0) return u_sticker0;
    if (i == 1) return u_sticker1;
    if (i == 2) return u_sticker2;
    if (i == 3) return u_sticker3;
    if (i == 4) return u_sticker4;
    if (i == 5) return u_sticker5;
    if (i == 6) return u_sticker6;
    if (i == 7) return u_sticker7;
    return vec4(0.0);
}

StickerData getSticker(vec2 pos) {
    StickerData sd;
    sd.dist = 1e5;
    sd.local = vec2(0.0);
    sd.cell = vec2(0.0);
    sd.shape = 0;
    sd.sealStyle = 0;
    sd.angle = 0.0;
    sd.radius = 0.65;
    sd.intensity = 0.0;
    
    float sSpacing = 2.65;
    
    // Evaluate active persistent medallion/sticker slots
    for (int i = 0; i < 8; ++i) {
        vec4 slot = getStickerSlot(i);
        if (slot.w < 0.5) continue; // Inactive / empty slot
        
        vec2 c = slot.xy;
        float intensity = slot.z;
        int sealStyle = clamp(int(floor(slot.w - 0.5)), 0, 4);
        
        vec2 jitter = hash22(c * 53.41 + vec2(8.1, 91.7)) * 0.28;
        vec2 sCenter = (c + 0.5 + jitter) * sSpacing;
        vec2 pDiff = pos - sCenter;
        
        // Fast bounding rejection against maximum radius (~0.85)
        if (abs(pDiff.x) > 1.2 || abs(pDiff.y) > 1.2) continue;
        
        float ang = hash12(c * 67.23) * 6.28318;
        float cosA = cos(ang), sinA = sin(ang);
        vec2 pRot = vec2(cosA * pDiff.x - sinA * pDiff.y, sinA * pDiff.x + cosA * pDiff.y);
        
        float sRad = 0.55 + hash12(c * 83.11) * 0.28;
        int shapeType = int(floor(hash12(c * 97.43) * 8.0));
        
        float d = 1e5;
        if (sealStyle == 0) {
            // Holographic security stickers (8 distinct silhouettes)
            if (shapeType == 0) {
                float r = length(pRot);
                float teeth = sin(atan(pRot.y, pRot.x) * 22.0) * (sRad * 0.035);
                d = (r - sRad) + teeth;
            } else if (shapeType == 1) {
                vec2 bSize = vec2(sRad * 1.15, sRad * 0.72);
                d = sdBox(pRot, bSize) - 0.08;
            } else if (shapeType == 2) {
                vec2 q = abs(pRot);
                d = max(q.x * 0.866025 + q.y * 0.5, q.y) - sRad;
            } else if (shapeType == 3) {
                float b1 = sdBox(pRot, vec2(sRad, sRad * 0.42));
                float b2 = sdBox(pRot, vec2(sRad * 0.42, sRad));
                vec2 p45 = vec2(pRot.x - pRot.y, pRot.x + pRot.y) * 0.707107;
                float b3 = sdBox(p45, vec2(sRad, sRad * 0.42));
                float b4 = sdBox(p45, vec2(sRad * 0.42, sRad));
                d = min(min(b1, b2), min(b3, b4)) - 0.04;
            } else if (shapeType == 4) {
                d = sdRhombus(pRot, vec2(sRad * 1.18, sRad * 0.76)) - 0.03;
            } else if (shapeType == 5) {
                float archCap = length(vec2(pRot.x, max(0.0, pRot.y - sRad * 0.15))) - sRad * 0.65;
                float archBox = sdBox(pRot + vec2(0.0, sRad * 0.22), vec2(sRad * 0.65, sRad * 0.60));
                d = min(archCap, archBox) - 0.025;
            } else if (shapeType == 6) {
                vec2 q6 = abs(pRot);
                float dBox6 = max(q6.x, q6.y);
                float dDiag6 = (q6.x + q6.y) * 0.707107;
                d = max(dBox6, dDiag6) - sRad;
            } else {
                float a12 = mod(atan(pRot.y, pRot.x) + 0.261799, 0.523599) - 0.261799;
                float r12 = length(pRot);
                d = (r12 - sRad) + cos(a12 * 6.0) * (sRad * 0.06);
            }
        } else if (sealStyle == 1) {
            // Crimson Cinnabar Wax / Rakkan Seal silhouettes with organic wax-drip edge wobble
            int dIdx = int(mod(float(shapeType), 6.0));
            float aWax = atan(pRot.y, pRot.x);
            float waxWobble = (sin(aWax * 3.0 + c.x * 4.1) * 0.045 + cos(aWax * 5.0 - c.y * 2.7) * 0.025) * sRad;
            if (dIdx == 0) {
                d = sdBox(pRot, vec2(sRad * 0.85, sRad * 0.85)) - 0.04 + waxWobble * 0.35;
            } else if (dIdx == 5) {
                float topL = length(pRot - vec2(0.0, sRad * 0.30)) - sRad * 0.40;
                float botL = length(pRot - vec2(0.0, -sRad * 0.22)) - sRad * 0.55;
                d = min(topL, botL) + waxWobble * 0.4;
            } else {
                d = length(pRot) - sRad + waxWobble;
            }
        } else if (sealStyle == 2) {
            // Flush Metal / Maki-e / Pietra Dura Inlay silhouettes
            int dIdx = int(mod(float(shapeType), 6.0));
            if (dIdx == 1) {
                d = sdBox(pRot, vec2(sRad * 0.88, sRad * 0.75)) - 0.04;
            } else if (dIdx == 2) {
                vec2 qm = abs(pRot);
                d = max(max(qm.x, qm.y), (qm.x + qm.y) * 0.707107) - sRad * 0.92;
            } else {
                d = length(pRot) - sRad * 0.92;
            }
        } else if (sealStyle == 3) {
            // Luthier Mother-of-Pearl & Abalone Rosette silhouettes
            int dIdx = int(mod(float(shapeType), 6.0));
            if (dIdx == 1) {
                d = sdRhombus(pRot, vec2(sRad * 0.95, sRad * 0.74)) - 0.02;
            } else {
                d = length(pRot) - sRad * 0.92;
            }
        } else {
            // Hot-Iron Pyrography Brand silhouettes
            int dIdx = int(mod(float(shapeType), 6.0));
            if (dIdx == 4) {
                d = sdBox(pRot, vec2(sRad * 0.72, sRad * 0.80)) - 0.05;
            } else {
                d = length(pRot) - sRad * 0.92;
            }
        }
        
        if (d < sd.dist) {
            sd.dist = d;
            sd.local = pRot;
            sd.cell = c;
            sd.shape = shapeType;
            sd.sealStyle = sealStyle;
            sd.angle = ang;
            sd.radius = sRad;
            sd.intensity = intensity;
        }
    }
    return sd;
}

// --- Composite Height Field of the Embossed Monolith ---
struct SurfaceData {
    float height;
    float glyphDist;
    float glyphEmbossSign;
    float textMask;
    vec2  pos;
    float stickerDist;
    vec2  stickerLocal;
    vec2  stickerCell;
    float stickerRadius;
    int   stickerShape;
    int   stickerStyle;
    float stickerIntensity;
    SubstrateSample substrate;
};

SurfaceData getSurface(vec2 uv) {
    float aspect = u_resolution.x / max(1.0, u_resolution.y);
    vec2 p = uv * vec2(aspect, 1.0);
    
    // Continuous creeping scroll with expanded 4x range
    float scrollTime = u_time * 0.035 * u_scroll_speed * (0.8 + u_vortex_speed * 0.4);
    vec2 scrollVec = vec2(0.10, 0.32) * scrollTime + u_ambient_drift;
    
    // Configurable Zoom and Spacing
    float zoom = max(0.25, u_glyph_zoom);
    vec2 pos = p * (3.8 * zoom) + scrollVec;
    float spacing = max(0.55, u_glyph_spacing);
    vec2 gridPos = pos / spacing;
    
    // Inscribed Quote Area in Scrolling Material Coordinates
    // Dynamic golden ratio portrait rectangle (height = 1.618034 * width)
    // Sized to enclose the fortune text tightly without dead empty borders
    vec2 quoteCoord = fract(pos * 0.055 + vec2(0.0, 0.45));
    vec2 quoteBox = abs(quoteCoord - 0.5);
    float qHalfW = (u_quote_size.x > 0.01) ? u_quote_size.x : 0.105;
    float qHalfH = qHalfW * 1.618034;
    
    // Quote presence check (pure typography, NO borders)
    float inQuote = step(quoteBox.x, qHalfW) * step(quoteBox.y, qHalfH);
    vec2 textUV = clamp((quoteCoord - vec2(0.5 - qHalfW, 0.5 - qHalfH)) / vec2(2.0 * qHalfW, 2.0 * qHalfH), 0.0, 1.0);
    float textMask = texture(u_text_texture, textUV).r * inQuote;
    float textSign = (hash12(floor(pos * 0.055) * 91.1) > 0.5) ? -1.0 : 1.0;
    float textH = textMask * 0.32 * textSign;
    
    // --- 1. Seamless, Borderless Random Glyph Scatter (3x3 Neighborhood) ---
    vec2 cell = floor(gridPos);
    float minGlyphDist = 1e5;
    float glyphSign = 1.0;
    
    // Tight clearance: ONLY exclude glyphs whose outer bounding radius intersects the quote box!
    // In quoteCoord space (scale 0.055), glyph radius is (0.36 * spacing) * 0.055.
    float glyphMargin = (0.36 * spacing) * 0.055 + 0.008;
    
    for (int dy = -1; dy <= 1; ++dy) {
        for (int dx = -1; dx <= 1; ++dx) {
            vec2 c = cell + vec2(float(dx), float(dy));
            
            // Check clearance from quote area (hugs quote tightly, zero empty desert!)
            vec2 centerMaterialPos = (c + 0.5) * spacing;
            vec2 cQuoteCoord = fract(centerMaterialPos * 0.055 + vec2(0.0, 0.45));
            vec2 dQuote = abs(cQuoteCoord - 0.5);
            if (dQuote.x < (qHalfW + glyphMargin) && dQuote.y < (qHalfH + glyphMargin)) {
                continue; // Suppress glyphs overlapping the quote
            }
            
            // Bounded position jitter (guaranteeing NO glyph-to-glyph overlap)
            vec2 jitter = (hash22(c * 17.31) - 0.5) * 0.28;
            vec2 center = c + 0.5 + jitter;
            vec2 pLocal = (gridPos - center) * spacing;
            
            // Flip Y so procedural glyphs render upright
            pLocal.y = -pLocal.y;
            
            // Bounded scale ensuring clearance margin between adjacent glyph boundaries
            float scale = 0.55 + hash12(c * 23.17) * 0.16;
            pLocal /= scale;
            
            // Subtle random tilt angle
            float angle = (hash12(c * 37.91) - 0.5) * 0.28;
            float cosA = cos(angle), sinA = sin(angle);
            pLocal = vec2(cosA * pLocal.x - sinA * pLocal.y, sinA * pLocal.x + cosA * pLocal.y);
            
            // Glyph ID selection (0..107 across 108 distinct fonts, scripts & emojis)
            int glyphId = int(floor(hash12(c * 53.73) * 108.0));
            
            // Varying typographic font weight per glyph cell (hairline, light, medium, bold, black)
            float weight = 0.015 + hash12(c * 67.31) * 0.018;
            float d = (evalGlyphSDF(pLocal, glyphId) - (weight - 0.024)) * scale;
            
            // Random embossing (+1.0: raised) vs debossing (-1.0: sunken/engraved)
            float signVal = (hash12(c * 71.39) > 0.48) ? 1.0 : -1.0;
            
            if (d < minGlyphDist) {
                minGlyphDist = d;
                glyphSign = signVal;
            }
        }
    }
    
    // Height contribution from scattered glyphs (with sharp chiseled bevels)
    float glyphH = smoothstep(0.040, -0.015, minGlyphDist) * 0.38 * glyphSign;
    float groove = smoothstep(0.012, 0.0, abs(minGlyphDist + 0.012)) * 0.06;
    glyphH -= groove * glyphSign;
    
    // --- 2. Independent Persistent Medallions, Wax Seals, Inlays, Brands & Holographic Stickers ---
    StickerData stk = getSticker(pos);
    float stickerH = 0.0;
    if (stk.intensity > 0.01) {
        float embVal = 0.0;
        if (stk.dist < 0.01) {
            vec2 qNorm = stk.local / max(0.1, stk.radius);
            vec2 emb = evalArtisanalEmblem(qNorm, stk.sealStyle, stk.shape);
            embVal = clamp(emb.x + emb.y, 0.0, 1.0);
        }

        if (stk.sealStyle == 0) {
            // Holographic security foil: raised glossy sticker film + micro-emboss
            float stickerStep = smoothstep(0.015, -0.015, stk.dist) * 0.035;
            float stickerBevel = smoothstep(0.012, 0.0, abs(stk.dist)) * 0.012;
            stickerH = stickerStep + stickerBevel + embVal * 0.006;
        } else if (stk.sealStyle == 1) {
            // Crimson Cinnabar Wax Seal: plump 3D poured wax rim + recessed interior + stamped emblem
            float waxBody = smoothstep(0.025, -0.035, stk.dist) * 0.115;
            float waxRim = smoothstep(0.11, 0.0, abs(stk.dist + 0.055)) * 0.068;
            stickerH = waxBody + waxRim + embVal * 0.042;
        } else if (stk.sealStyle == 2 || stk.sealStyle == 3) {
            // Flush Metal / Maki-e / Pietra Dura / Mother-of-Pearl Inlay: micro-recessed setting groove
            float groutGroove = smoothstep(0.016, 0.0, abs(stk.dist)) * 0.024;
            stickerH = -groutGroove + embVal * 0.012;
        } else {
            // Hot-Iron Pyrography Brand: charred deeply INTO the wood grain
            stickerH = -embVal * 0.042 * smoothstep(0.02, -0.02, stk.dist);
        }
    }

    // Attenuate underlying carved glyphs under opaque medallions (wax seals, stickers, flush inlays)
    // while keeping pyrography brands (sealStyle == 4) naturally conformed to the wood surface.
    float medallionCover = (stk.intensity > 0.01 && stk.sealStyle != 4)
                         ? smoothstep(0.014, -0.020, stk.dist) : 0.0;
    glyphH *= (1.0 - medallionCover * 0.92);
    
    // --- 3. Procedural Geological / Porcelain / Metal / Wood Slab Substrate ---
    // Automatically attenuated under the fortune quote tablet to preserve typographic legibility
    SubstrateSample sub = evalSubstrate(pos);
    float substrateH = sub.height * (1.0 - textMask * 0.85);
    
    // --- 4. Interactive Tactile Cursor Deformation (Modifying Embossing) ---
    vec2 ptrDistVec = (uv - u_pointer) * vec2(aspect, 1.0);
    float ptrDist = length(ptrDistVec);
    float cursorIndent = -0.32 * exp(-(ptrDist * ptrDist) / 0.018);
    float ptrSpeed = length(u_pointer_vel);
    float wake = sin(ptrDist * 32.0 - mod(u_time * 7.0, 6.2831853)) * exp(-ptrDist * 10.0) * ptrSpeed * 0.35;
    
    // Keystroke ripple / shockwave displacement
    vec2 kDiff = (uv - u_keystroke_pos) * vec2(aspect, 1.0);
    float kDist = length(kDiff);
    float ripple = sin(kDist * 32.0 - mod(u_time * 8.0, 6.2831853)) * exp(-kDist * 4.0) * u_shockwave_intensity * 0.08;
    
    float totalH = 0.5 + glyphH + textH + stickerH + substrateH + cursorIndent + wake + ripple;
    
    SurfaceData sd;
    sd.height = totalH;
    sd.glyphDist = minGlyphDist;
    sd.glyphEmbossSign = glyphSign;
    sd.textMask = textMask;
    sd.pos = pos;
    sd.stickerDist = stk.dist;
    sd.stickerLocal = stk.local;
    sd.stickerCell = stk.cell;
    sd.stickerRadius = stk.radius;
    sd.stickerShape = stk.shape;
    sd.stickerStyle = stk.sealStyle;
    sd.stickerIntensity = stk.intensity;
    sd.substrate = sub;
    return sd;
}

// --- Main Shading & Material Pipeline ---
void main() {
    vec2 uv = qt_TexCoord0;
    float aspect = u_resolution.x / max(1.0, u_resolution.y);
    
    SurfaceData surf = getSurface(uv);
    float h = surf.height;
    vec2 pos = surf.pos;
    
    // --- Aspect-Correct Normal via Screen-Space Hardware Derivatives ---
    float dh_dx = dFdx(h);
    float dh_dy = dFdy(h);
    vec2 grad = vec2(dh_dx * aspect, dh_dy) * u_emboss_depth * 7.5;

    // Edge discontinuity conditioning (suppresses 2x2 quad stepping across SDF boundaries)
    float gradMag = length(grad);
    if (gradMag > 12.0) {
        grad = normalize(grad) * 12.0;
    }
    vec3 N = normalize(vec3(-grad.x, -grad.y, 1.0));
    
    // View vector
    vec3 V = normalize(vec3(0.5 - uv.x, 0.5 - uv.y, 1.4));
    
    // --- Material Phase Mapping (Affixed to Scrolling Material Space) ---
    // Periodic mod 256.0 matches noise2D lattice period, preventing float precision loss forever
    vec2 matCoord = mod(pos * 0.42 + vec2(mod(u_time * 0.008, 256.0), mod(u_time * 0.004, 256.0)), 256.0);
    float warp = noise2D(matCoord * 2.0);
    float phaseNoise = noise2D(matCoord + vec2(warp * 0.42, -warp * 0.32)) * 0.5 + 0.5;
    float phaseAux   = noise2D(matCoord * 1.6 + vec2(19.2, 54.7)) * 0.5 + 0.5;
    
    // Shifting material weights:
    // Matte Stone / Slate vs. Vitreous Porcelain (SSS) vs. Iridescent Thin-Film Sheen
    float wMatte      = smoothstep(0.48, 0.22, phaseNoise);
    float wPorcelain  = smoothstep(0.20, 0.45, phaseNoise) * smoothstep(0.80, 0.58, phaseNoise);
    float wIridescent = smoothstep(0.55, 0.78, phaseNoise);
    
    // --- Directional Key Light + Counter-Orbiting Soft Rim Fill Light ---
    float lightAng = mod(u_time * 0.32, 6.2831853);
    vec3 L_key = normalize(vec3(cos(lightAng) * 0.55 - 0.25, sin(lightAng) * 0.45 + 0.4, 0.85));
    vec3 H_key = normalize(L_key + V);

    float fillAng = mod(-u_time * 0.19 + 2.4, 6.2831853);
    vec3 L_fill = normalize(vec3(cos(fillAng) * 0.50 + 0.30, sin(fillAng) * 0.45 - 0.35, 0.80));
    vec3 H_fill = normalize(L_fill + V);
    
    // Ambient Occlusion in carved/sunken crevices
    float ao = clamp(smoothstep(-0.06, 0.03, surf.glyphDist) * 0.45 + 0.55, 0.0, 1.0);
    
    // --- Shading Phase 1: Procedural Substrate Base (Porcelain / Stone / Metal / Wood) ---
    SubstrateSample sub = surf.substrate;
    float diffKey = max(0.0, dot(N, L_key));
    float diffFill = max(0.0, dot(N, L_fill)) * 0.25;
    float diffuse = (diffKey * 0.72 + diffFill + 0.22) * ao;

    vec3 subAlbedo = mix(u_color_stone.rgb, u_color_porcelain.rgb, sub.albedoMix * 0.78);
    // Kintsugi gold seams, oil-spot highlights, calcite veins, or brushed flame accents
    vec3 subAccentCol = mix(u_color_gold.rgb, u_color_sheen.rgb, 0.28);
    float subSpecPow = mix(14.0, 120.0, sub.gloss);
    float subSpec = pow(max(0.0, dot(N, H_key)), subSpecPow) * sub.gloss * 0.55;

    // Optical chatoyancy for figured Tiger-Flame Maple: sinusoidal fiber tilt flips brightness as light orbits
    float chatoyantSpec = 0.0;
    if (abs(sub.chatoyancy) > 0.01) {
        vec3 N_fiber = normalize(N + vec3(sub.chatoyancy * 0.42, 0.0, 0.0));
        chatoyantSpec = pow(max(0.0, dot(N_fiber, H_key)), 24.0) * (0.55 + 0.45 * sub.chatoyancy);
    }

    vec3 colMatte = subAlbedo * diffuse
                  + subAccentCol * (sub.accentMask * (0.45 + 0.75 * diffKey + subSpec * 1.6)) * 0.55
                  + mix(vec3(1.0), u_color_gold.rgb, 0.35) * (subSpec + chatoyantSpec * 0.65);
    
    // --- Shading Phase 2: Translucent Porcelain & Subsurface Scattering (SSS) ---
    // Subsurface glow: light bleeding through thin carved edges
    float sssThickness = clamp((1.0 - h) * 1.6 + smoothstep(-0.02, 0.06, surf.glyphDist) * 0.5, 0.0, 1.0);
    float sssKey = pow(clamp(dot(V, -L_key + N * 0.35), 0.0, 1.0), 3.5) * exp(-sssThickness * 2.5);
    float sssTotal = sssKey * 1.6;
    
    // Vitreous glossy clearcoat highlight modulated by substrate gloss
    float specKeyGloss = pow(max(0.0, dot(N, H_key)), mix(28.0, 108.0, sub.gloss)) * (0.35 + 0.65 * sub.gloss);
    float fresnelGlaze = pow(1.0 - max(0.0, dot(N, V)), 4.0) * (0.25 + 0.75 * sub.gloss);
    vec3 porcBase = mix(u_color_porcelain.rgb, subAlbedo, 0.38);
    vec3 colPorcelain = mix(porcBase * (diffuse * 0.8 + 0.2), vec3(1.0), fresnelGlaze * 0.45) 
                        + u_color_sheen.rgb * sssTotal * 0.55
                        + subAccentCol * sub.accentMask * 0.45
                        + vec3(1.0) * specKeyGloss * 0.75;
    
    // --- Shading Phase 3a: Theme-Aware Thin-Film Iridescence (Belcour & Barla, SIGGRAPH 2017) ---
    // Smoothly adapts film thickness and IOR per palette:
    // u_film_regime = 0.0 -> thin high-IOR metallic bismuth (0.18..0.46 um, eta = 1.85)
    // u_film_regime = 1.0 -> thick moderate-IOR pearlescent opal & abalone nacre (0.50..1.06 um, eta = 1.38)
    float cosThetaN = max(0.0, dot(N, V));
    float cosThetaIrid = max(0.01, dot(H_key, V));
    float regime = clamp(u_film_regime, 0.0, 1.0);
    float filmEta = mix(1.85, 1.38, regime);
    // Couple substrate height & accent structure into film thickness so Bismuth hopper terraces
    // and Abalone aragonite growth bands shift smoothly across the physical spectrum
    float geomShift = sub.height * 6.5 + sub.accentMask * 0.35;
    float filmWave = 0.5 + 0.5 * sin(phaseAux * 6.2831853 + geomShift * 4.2 + mod(u_time * 0.15, 6.2831853));
    float filmThicknessUm = mix(mix(0.18, 0.50, regime), mix(0.46, 1.06, regime), filmWave);
    vec3 iridBaseF0 = mix(u_color_sheen.rgb, vec3(0.85), 0.35);
    vec3 iridSpectrum = evalIridescence(cosThetaIrid, filmThicknessUm, filmEta, iridBaseF0);
    float iridWeight = clamp((0.25 + 0.75 * pow(1.0 - cosThetaN, 2.0)) * u_iridescence_strength, 0.0, 1.0);
    vec3 colIridescent = mix(subAlbedo * diffuse, iridSpectrum * (0.38 + 0.62 * diffuse), iridWeight);
    colIridescent += iridSpectrum * specKeyGloss * 1.15;
    
    // --- Composite Base Surface Material ---
    vec3 finalColor = colMatte * wMatte + colPorcelain * wPorcelain + colIridescent * wIridescent;
    // On high-iridescence substrates (Bismuth oxide, Abalone nacre, Obsidian), let the substrate's
    // stepped terraces & lamellae carry a subtle continuous spectral sheen across the full slab
    float continuousIrid = clamp((u_iridescence_strength - 1.35) * 0.45, 0.0, 0.40);
    finalColor = mix(finalColor, finalColor * 0.72 + iridSpectrum * (0.34 + 0.58 * diffuse) * (0.45 + 0.55 * sub.accentMask), continuousIrid);
    
    // --- Surface Tangent Basis & Glint Slope Frame ---
    vec3 up_surf = abs(N.z) < 0.99 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
    vec3 T_surf = normalize(cross(up_surf, N));
    vec3 B_surf = cross(N, T_surf);
    
    float NdotH = dot(N, H_key);
    float NdotL = max(0.001, dot(N, L_key));
    float NdotV = max(0.001, dot(N, V));
    float VdotH = max(0.001, dot(V, H_key));
    
    float hx = dot(T_surf, H_key);
    float hy = dot(B_surf, H_key);
    float hz = NdotH;
    vec2 slopes = -vec2(hx, hy) / max(0.0001, hz);

    float hzFill = max(0.0001, dot(N, H_fill));
    vec2 slopesFill = -vec2(dot(T_surf, H_fill), dot(B_surf, H_fill)) / hzFill;
    float hz4Fill = hzFill * hzFill * hzFill * hzFill;
    
    float alphaGlitter = 0.36;
    float hz4 = hz * hz * hz * hz;
    
    // Smith Masking-Shadowing for Beckmann distribution
    float tan2V = max(0.0, (1.0 - NdotV * NdotV) / (NdotV * NdotV));
    float tan2L = max(0.0, (1.0 - NdotL * NdotL) / (NdotL * NdotL));
    float g1V = 2.0 / (1.0 + sqrt(1.0 + 3.14159 * alphaGlitter * alphaGlitter * tan2V));
    float g1L = 2.0 / (1.0 + sqrt(1.0 + 3.14159 * alphaGlitter * alphaGlitter * tan2L));
    float G_smith = g1V * g1L;
    
    // Schlick Fresnel for metallic gold microflakes
    vec3 F0_flake = mix(u_color_gold.rgb, vec3(1.0), 0.35);
    vec3 F_flake = F0_flake + (vec3(1.0) - F0_flake) * pow(clamp(1.0 - VdotH, 0.0, 1.0), 5.0);
    
    // Screen-Resolution Proportional Microflake Density (Deliot & Belcour, HPG 2023)
    float targetPixelsPerFlake = 1.35;
    float zoomScale = max(0.25, u_glyph_zoom);
    float pixelsPerMaterialUnit = u_resolution.y / (3.8 * zoomScale);
    float flakeFreq = max(48.0, pixelsPerMaterialUnit / targetPixelsPerFlake);

    // --- Shading Phase 4: Patterned Physically Based Microflake Glints (Deliot & Belcour, HPG 2023) ---
    // Pure-ALU O(1) distributed binomial law on an equilateral simplex grid (zero texture lookups).
    // Tuned for high-contrast diamond-pinpoint scintillation (slopeScale = 20.0, zeta = 1.85)
    // with dual-light (key + counter-orbiting rim fill) excitation.
    if (u_glitter_density > 0.01 && NdotH > 0.01) {
        // Veined mineral distribution (wrapped mod 256.0 to match periodic noise2D lattice)
        float veinNoise = noise2D(mod(pos * 0.55, 256.0) + vec2(warp * 0.40, -warp * 0.30));
        float mineralVein = smoothstep(0.38, 0.72, veinNoise);
        
        // Concentrated gold inlay inside carved glyph crevices and raised bevels
        float glyphInlay = smoothstep(0.035, -0.020, surf.glyphDist);
        
        // Modulate stone glitter between natural mineral veins and patterned glyph inlays
        float stoneGlitterMask = mix(mineralVein * 0.85 + 0.15, max(mineralVein * 0.35, glyphInlay * 1.6), u_holo_mode);
        
        // Suppress stone glitter inside fortune text area so typography remains crisp and clear
        stoneGlitterMask *= (1.0 - surf.textMask * 0.88);
        
        // Scroll-free screen-space flake coordinates and derivatives (always bounded in [0, ~3000])
        vec2 screenFlakeUV = (uv * vec2(aspect, 1.0)) * (3.8 * zoomScale * flakeFreq);
        float stoneFootprintLen = max(length(dFdx(screenFlakeUV)), length(dFdy(screenFlakeUV)));
        vec2 screenSkewed = vec2(screenFlakeUV.x - 0.57735027 * screenFlakeUV.y, 1.15470054 * screenFlakeUV.y);
        
        float stoneLogDensity = mix(0.65, 1.85, clamp(u_glitter_density * stoneGlitterMask, 0.0, 1.0));
        
        // Key light glints (warm metallic gold with subtle R/G/B slope dispersion)
        float p22_G = evalDeliotGlintP22(screenSkewed, u_glitter_scroll, stoneFootprintLen, slopes,        alphaGlitter, 20.0, stoneLogDensity, 1.85, 1.4);
        float p22_R = evalDeliotGlintP22(screenSkewed, u_glitter_scroll, stoneFootprintLen, slopes * 0.98, alphaGlitter, 20.0, stoneLogDensity, 1.85, 1.4);
        float p22_B = evalDeliotGlintP22(screenSkewed, u_glitter_scroll, stoneFootprintLen, slopes * 1.02, alphaGlitter, 20.0, stoneLogDensity, 1.85, 1.4);
        
        vec3 D_glint = vec3(p22_R, p22_G, p22_B) / max(0.0001, hz4);
        vec3 glintRadiance = (F_flake * G_smith * D_glint) / (4.0 * NdotV);

        // Secondary counter-orbiting rim fill glints (cool sheen accent so off-axis facets catch light)
        float p22_fill = evalDeliotGlintP22(screenSkewed, u_glitter_scroll, stoneFootprintLen, slopesFill, alphaGlitter, 20.0, stoneLogDensity, 1.85, 1.4);
        vec3 fillTint = mix(u_color_sheen.rgb, vec3(1.0), 0.45);
        glintRadiance += (fillTint * G_smith * (p22_fill / max(0.0001, hz4Fill))) / (4.0 * NdotV) * 0.38;
        
        // Analytical HDR optical bloom synthesis for high-intensity specular peaks
        float glintMag = max(glintRadiance.r, max(glintRadiance.g, glintRadiance.b));
        float flareIntensity = pow(clamp(glintMag * 0.14, 0.0, 1.0), 0.6);
        vec3 flareColor = mix(u_color_gold.rgb, vec3(1.0), 0.45);
        vec3 luminousGlint = glintRadiance + flareColor * (flareIntensity * 1.75);
        
        finalColor += luminousGlint * (u_glitter_density * stoneGlitterMask * 1.15);
    }
    
    // --- Shading Phase 5: Gilded Inlay on Embossed Ridges ---
    if (surf.glyphDist < -0.015 && surf.glyphEmbossSign > 0.0) {
        float goldMask = smoothstep(-0.015, -0.045, surf.glyphDist);
        float goldSpec = pow(max(0.0, dot(N, H_key)), 48.0) * 0.8;
        vec3 goldShade = u_color_gold.rgb * (diffuse * 0.6 + 0.4) + u_color_gold.rgb * goldSpec * 1.4;
        finalColor = mix(finalColor, goldShade, goldMask * 0.5);
    }
    
    // --- Shading Phase 6: Independent Persistent Medallions, Wax Seals, Inlays, Brands & Holographic Stickers ---
    // Dispatches on surf.stickerStyle:
    //   0: Holographic Security Foil Stickers (8 shapes, 3 foil modes)
    //   1: Crimson Cinnabar Wax / Rakkan Seals (6 designs, organic wax SSS)
    //   2: Flush Brushed Metal / Maki-e / Pietra Dura Inlays (6 designs)
    //   3: Luthier Mother-of-Pearl & Abalone Rosette Inlays (6 designs, Belcour & Barla iridescence)
    //   4: Hot-Iron Pyrography Wood Brands (6 designs, scorched grain carving)
    if (surf.stickerIntensity > 0.01 && surf.stickerDist < 0.065) {
        float stickerMask = smoothstep(0.010, -0.010, surf.stickerDist);
        float holoPwr = surf.stickerIntensity;
        vec2 qSticker = surf.stickerLocal / max(0.1, surf.stickerRadius);
        vec2 emblem = evalArtisanalEmblem(qSticker, surf.stickerStyle, surf.stickerShape);
        float totalEmblem = clamp(emblem.x + emblem.y, 0.0, 1.0);

        if (surf.stickerStyle == 0) {
            // === STYLE 0: Holographic Security Foil Stickers (CD / Diamond-Dust Vinyl / Hybrid) ===
            int foilMode = int(floor(hash12(surf.stickerCell * 43.17 + vec2(11.3, 79.1)) * 3.0));
            
            vec2 dTrack = surf.stickerLocal;
            float rTrack = length(dTrack);
            vec3 T_disc = normalize(vec3(-dTrack.y, dTrack.x, 0.001));
            
            vec3 T_cdA = normalize(T_disc - N * dot(N, T_disc));
            vec3 B_cdA = normalize(cross(N, T_cdA));
            
            // Multi-order Kirchhoff diffraction grating (Stam 1999 / Toisoul & Ghosh 2017) + CIE XYZ spectral color
            float gratingSweep = 0.08 * sin(mod(u_time * 0.45, 6.2831853));
            float v_cdA = dot(T_cdA, H_key);
            vec3 cdRainbowA = evalDiffractionGrating(B_cdA, L_key, V, 1480.0, rTrack * 0.18 + gratingSweep);
            float cdFanA = exp(-(v_cdA * v_cdA) / (2.0 * 0.048 * 0.048)) * pow(max(0.0, dot(N, H_key)), 12.0);
            
            float v_cdB = dot(B_cdA, H_key);
            vec3 cdRainbowB = evalDiffractionGrating(T_cdA, L_key, V, 1120.0, rTrack * 0.24 - gratingSweep);
            float cdFanB = exp(-(v_cdB * v_cdB) / (2.0 * 0.048 * 0.048)) * pow(max(0.0, dot(N, H_key)), 12.0);
            
            float cdBroad = pow(max(0.0, dot(N, H_key)), 34.0) * 0.6;
            
            float edgeGlint = pow(max(0.0, dot(N, H_key)), 36.0) * smoothstep(0.02, 0.0, abs(surf.stickerDist)) * 1.4;
            float edgeShadow = smoothstep(-0.005, 0.02, surf.stickerDist) * smoothstep(0.035, 0.01, surf.stickerDist) * 0.45;
            
            float isGoldFoil = step(0.48, hash12(surf.stickerCell * 19.3));
            vec3 foilMetal = mix(vec3(0.92, 0.94, 0.97), u_color_gold.rgb * 1.35, isGoldFoil);
            float foilSpec = pow(max(0.0, dot(N, H_key)), 42.0) * 0.85;
            vec3 colFoil = foilMetal * (diffuse * 0.35 + 0.65) * (1.0 - edgeShadow) + foilMetal * foilSpec;
            
            float microDots = step(0.65, sin(qSticker.x * 85.0) * sin(qSticker.y * 85.0)) * 0.16;
            colFoil += cdRainbowA * microDots * 0.35 * holoPwr;
            
            if (foilMode >= 1 && NdotH > 0.01) {
                float sFlakeFreq = flakeFreq * 1.4;
                vec2 sFlakeCoord = surf.stickerLocal * sFlakeFreq;
                float sFootprintLen = max(length(dFdx(sFlakeCoord)), length(dFdy(sFlakeCoord)));
                vec2 sSkewed = vec2(sFlakeCoord.x - 0.57735027 * sFlakeCoord.y, 1.15470054 * sFlakeCoord.y);
                
                float sP22_G = evalDeliotGlintP22(sSkewed, vec2(0.0), sFootprintLen, slopes,        alphaGlitter, 24.0, 1.05, 2.0, 1.4);
                float sP22_R = evalDeliotGlintP22(sSkewed, vec2(0.0), sFootprintLen, slopes * 0.93, alphaGlitter, 24.0, 1.05, 2.0, 1.4);
                float sP22_B = evalDeliotGlintP22(sSkewed, vec2(0.0), sFootprintLen, slopes * 1.07, alphaGlitter, 24.0, 1.05, 2.0, 1.4);
                
                vec3 sD_glint = vec3(sP22_R, sP22_G, sP22_B) / max(0.0001, hz4);
                
                float sP22_fill = evalDeliotGlintP22(sSkewed, vec2(0.0), sFootprintLen, slopesFill, alphaGlitter, 24.0, 1.05, 2.0, 1.4);
                sD_glint += vec3(sP22_fill / max(0.0001, hz4Fill)) * 0.40;
                
                float sDispersionPhase = dot(slopes, vec2(14.0, 9.5)) + hash12(floor(sFlakeCoord) * 17.9) * 6.28318;
                vec3 sRainbowTint = 0.5 + 0.5 * cos(sDispersionPhase + vec3(0.0, 2.094, 4.189));
                
                vec3 sGlintRadiance = (F_flake * G_smith * sD_glint) / (4.0 * NdotV);
                
                float sGlintMag = max(sGlintRadiance.r, max(sGlintRadiance.g, sGlintRadiance.b));
                float sFlare = pow(clamp(sGlintMag * 0.16, 0.0, 1.0), 0.55);
                vec3 sLuminousGlint = sGlintRadiance * sRainbowTint + (sRainbowTint + vec3(0.75)) * (sFlare * 2.0);
                
                vec3 stickerGlitter = sLuminousGlint * (foilMode == 1 ? 2.4 : 1.6) * holoPwr;
                colFoil += stickerGlitter;
            }
            
            float cdWeight = (foilMode == 1) ? 0.45 : 1.0;
            vec3 lightA = cdRainbowA * (cdFanA * 5.2 + cdBroad * 1.4) * holoPwr * cdWeight;
            vec3 lightB = cdRainbowB * (cdFanB * 5.2 + cdBroad * 1.4) * holoPwr * cdWeight;
            float emblemGlint = pow(max(0.0, dot(N, H_key)), 110.0) * 2.0;
            
            vec3 colEmblem = (lightA + vec3(emblemGlint)) * emblem.x +
                             (lightB + vec3(emblemGlint)) * emblem.y;
            
            vec3 colSticker = mix(colFoil, colFoil * 0.25 + colEmblem, totalEmblem);
            
            float stickerGloss = pow(max(0.0, dot(N, H_key)), 220.0) * 2.4;
            float stickerFresnel = pow(1.0 - max(0.0, dot(N, V)), 3.5);
            
            colSticker += vec3(1.0) * stickerGloss;
            colSticker = mix(colSticker, vec3(1.0), stickerFresnel * 0.35);
            colSticker += vec3(1.0) * edgeGlint;
            
            finalColor = mix(finalColor, colSticker, stickerMask);
        } else if (surf.stickerStyle == 1) {
            // === STYLE 1: Crimson Cinnabar Wax / Rakkan Seal Stamp ===
            // Soft cast contact shadow on the ceramic slab outside the poured wax rim
            float castShadow = smoothstep(0.060, 0.002, surf.stickerDist) * smoothstep(-0.006, 0.014, surf.stickerDist);
            finalColor *= (1.0 - castShadow * 0.42);

            vec3 waxBase = vec3(0.72, 0.11, 0.09);
            vec3 waxDeep = vec3(0.28, 0.03, 0.03);
            vec3 waxSSS  = vec3(0.98, 0.30, 0.16) * pow(clamp(dot(V, -L_key + N * 0.45), 0.0, 1.0), 2.2) * 0.52;
            float waxRimAO = smoothstep(-0.10, 0.0, surf.stickerDist) * 0.48;
            float waxRimHighlight = smoothstep(0.09, 0.0, abs(surf.stickerDist + 0.055));
            float waxSpec = pow(max(0.0, dot(N, H_key)), 64.0) * 0.95 + pow(max(0.0, dot(N, H_fill)), 32.0) * 0.25;
            vec3 colWax = mix(waxBase, waxDeep, waxRimAO) * (diffuse * 0.88 + 0.22)
                        + waxSSS
                        + vec3(1.0, 0.86, 0.80) * waxSpec * (0.75 + 0.45 * waxRimHighlight);
            // Subtle gilded powder rub on the raised stamped emblem ridges
            vec3 emblemWax = mix(waxBase * 1.32 + vec3(1.0, 0.88, 0.78) * waxSpec * 1.4, u_color_gold.rgb * (diffuse * 0.8 + 0.45), 0.36);
            colWax = mix(colWax, emblemWax, totalEmblem * 0.88);
            finalColor = mix(finalColor, colWax, stickerMask);
        } else if (surf.stickerStyle == 2) {
            // === STYLE 2: Flush Brushed Metal / Maki-e / Pietra Dura Medallion Inlay ===
            float brush = noise2D(mod(vec2(qSticker.x * 48.0, qSticker.y * 6.0), 256.0)) * 0.08;
            vec3 metalBase = mix(u_color_gold.rgb, vec3(0.92, 0.85, 0.72), 0.22 + brush);
            float metalSpec = pow(max(0.0, dot(N, H_key)), 72.0) * 1.35 + pow(max(0.0, dot(N, H_fill)), 36.0) * 0.35;
            float settingGroove = smoothstep(0.025, 0.0, abs(surf.stickerDist));
            vec3 colMetal = metalBase * (diffuse * 0.72 + 0.32) + metalBase * metalSpec;
            // Oxidized dark antique bronze/patina in recessed emblem channels + bright gilded motif
            vec3 darkRecess = u_color_stone.rgb * 0.45;
            colMetal = mix(colMetal, darkRecess + u_color_gold.rgb * (0.25 + metalSpec * 0.5), emblem.x * 0.65);
            colMetal = mix(colMetal, metalBase * 1.25 + vec3(1.0, 0.95, 0.82) * metalSpec * 1.2, emblem.y * 0.85);
            colMetal *= (1.0 - settingGroove * 0.65);
            finalColor = mix(finalColor, colMetal, stickerMask);
        } else if (surf.stickerStyle == 3) {
            // === STYLE 3: Luthier Mother-of-Pearl & Abalone Rosette Inlay ===
            vec3 ebonyPurfling = vec3(0.05, 0.035, 0.025) * (diffuse + 0.22);
            float mopThick = 0.62 + 0.32 * fbm3(surf.stickerLocal * 7.5);
            vec3 mopIrid = evalIridescence(max(0.05, dot(H_key, V)), mopThick, 1.38, vec3(0.88, 0.92, 0.96));
            float mopSpec = pow(max(0.0, dot(N, H_key)), 120.0) * 1.65 + pow(max(0.0, dot(N, H_fill)), 48.0) * 0.45;
            vec3 colPearl = mix(vec3(0.88, 0.92, 0.90), mopIrid * 1.55, 0.68) * (diffuse * 0.70 + 0.45) + vec3(1.0) * mopSpec;
            vec3 colAbalone = mix(vec3(0.45, 0.88, 0.84), mopIrid * 1.75, 0.82) * (diffuse * 0.70 + 0.45) + vec3(0.95, 1.0, 1.0) * mopSpec;
            // Preserve warm figured wood inside the rosette field, framed by crisp dark ebony purfling
            float outerPurf = smoothstep(0.036, 0.0, abs(surf.stickerDist + 0.018));
            float innerRingPurf = smoothstep(0.022, 0.0, abs(length(qSticker) - 0.72));
            vec3 colInlay = finalColor * 0.82;
            colInlay = mix(colInlay, ebonyPurfling, max(outerPurf * 0.90, innerRingPurf * 0.72));
            colInlay = mix(colInlay, colPearl, emblem.x);
            colInlay = mix(colInlay, colAbalone, emblem.y);
            finalColor = mix(finalColor, colInlay, stickerMask);
        } else {
            // === STYLE 4: Hot-Iron Pyrography Wood Brand (Scorched into Wood Grain) ===
            float outerScorch = smoothstep(0.055, -0.02, surf.stickerDist) * 0.26;
            float strokeHalo = smoothstep(0.05, 0.55, totalEmblem) * 0.55;
            vec3 toastedWood = finalColor * vec3(0.62, 0.40, 0.24);
            vec3 charredCarbon = finalColor * 0.09 + vec3(0.03, 0.018, 0.010) * diffuse;
            vec3 colBrand = mix(finalColor, toastedWood, clamp(outerScorch + strokeHalo, 0.0, 0.78));
            colBrand = mix(colBrand, charredCarbon, smoothstep(0.18, 0.78, totalEmblem) * 0.94);
            finalColor = mix(finalColor, colBrand, smoothstep(0.045, -0.010, surf.stickerDist));
        }
    }
    
    // --- Active Keystroke Shockwave & Energy Vein Glow ---
    if (u_keystroke_energy > 0.01) {
        float kPulse = sin(surf.glyphDist * 40.0 - mod(u_time * 12.0, 6.2831853)) * 0.5 + 0.5;
        float energyVein = smoothstep(0.04, -0.02, surf.glyphDist) * u_keystroke_energy * kPulse;
        finalColor += u_color_sheen.rgb * energyVein * 1.4;
    }
    
    // Subtle cinematic vignette
    vec2 vigUV = uv * (1.0 - uv.yx);
    float vignette = clamp(vigUV.x * vigUV.y * 22.0, 0.0, 1.0);
    finalColor = mix(u_color_void.rgb, finalColor, vignette);
    
    // Soft-shoulder tone mapping: preserves saturated color in intense specular glints
    // Prevents hard channel clipping to flat white while keeping shadows and midtones pristine
    vec3 mappedColor = finalColor / (vec3(1.0) + finalColor * 0.18);
    finalColor = mix(finalColor, mappedColor, smoothstep(0.7, 2.5, max(finalColor.r, max(finalColor.g, finalColor.b))));
    
    fragColor = vec4(finalColor, 1.0) * qt_Opacity;
}
