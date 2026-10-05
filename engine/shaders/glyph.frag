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
    float u_pad1;                // 268..271
    vec2  u_quote_size;          // 272..279 (quote bounding half-width and half-height)
    float u_pad2;                // 280..283
    float u_pad3;                // 284..287
    vec4  u_sticker0;            // 288..303 (Active sticker slot 0: cx, cy, intensity, active)
    vec4  u_sticker1;            // 304..319 (Active sticker slot 1)
    vec4  u_sticker2;            // 320..335 (Active sticker slot 2)
    vec4  u_sticker3;            // 336..351 (Active sticker slot 3)
    vec4  u_sticker4;            // 352..367 (Active sticker slot 4)
    vec4  u_sticker5;            // 368..383 (Active sticker slot 5)
    vec4  u_sticker6;            // 384..399 (Active sticker slot 6)
    vec4  u_sticker7;            // 400..415 (Active sticker slot 7, total 416 bytes, 16-byte aligned)
};

layout(binding = 1) uniform sampler2D u_text_texture;

// --- Fast GPU Noise & Hash Primitives ---
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
        
    } else {
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
    }
    
    return clamp(emblem, 0.0, 1.0);
}

// --- Procedural Holographic Security Stickers (Independent Persistent Layer) ---
struct StickerData {
    float dist;
    vec2  local;
    vec2  cell;
    int   shape;
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
    sd.angle = 0.0;
    sd.radius = 0.65;
    sd.intensity = 0.0;
    
    float sSpacing = 4.2;
    
    // Evaluate active persistent sticker slots
    for (int i = 0; i < 8; ++i) {
        vec4 slot = getStickerSlot(i);
        if (slot.w < 0.5) continue; // Inactive / empty slot
        
        vec2 c = slot.xy;
        float intensity = slot.z;
        
        vec2 jitter = (hash22(c * 53.41 + vec2(8.1, 91.7)) - 0.5) * 0.55;
        vec2 sCenter = (c + 0.5 + jitter) * sSpacing;
        vec2 pDiff = pos - sCenter;
        
        // Fast bounding rejection against sticker maximum radius (~0.85)
        if (abs(pDiff.x) > 1.2 || abs(pDiff.y) > 1.2) continue;
        
        float ang = hash12(c * 67.23) * 6.28318;
        float cosA = cos(ang), sinA = sin(ang);
        vec2 pRot = vec2(cosA * pDiff.x - sinA * pDiff.y, sinA * pDiff.x + cosA * pDiff.y);
        
        float sRad = 0.55 + hash12(c * 83.11) * 0.28;
        int shapeType = int(floor(hash12(c * 97.43) * 4.0));
        
        float d = 1e5;
        if (shapeType == 0) {
            // Circular seal with fine notched / serrated gear edge
            float r = length(pRot);
            float teeth = sin(atan(pRot.y, pRot.x) * 22.0) * (sRad * 0.035);
            d = (r - sRad) + teeth;
        } else if (shapeType == 1) {
            // Rounded rectangular security badge
            vec2 bSize = vec2(sRad * 1.15, sRad * 0.72);
            d = sdBox(pRot, bSize) - 0.08;
        } else if (shapeType == 2) {
            // Hexagonal prism sticker
            vec2 q = abs(pRot);
            d = max(q.x * 0.866025 + q.y * 0.5, q.y) - sRad;
        } else {
            // 8-Pointed Starburst Hologram Seal (classic "AUTHENTIC" sticker)
            float b1 = sdBox(pRot, vec2(sRad, sRad * 0.42));
            float b2 = sdBox(pRot, vec2(sRad * 0.42, sRad));
            vec2 p45 = vec2(pRot.x - pRot.y, pRot.x + pRot.y) * 0.7071;
            float b3 = sdBox(p45, vec2(sRad, sRad * 0.42));
            float b4 = sdBox(p45, vec2(sRad * 0.42, sRad));
            d = min(min(b1, b2), min(b3, b4)) - 0.04;
        }
        
        if (d < sd.dist) {
            sd.dist = d;
            sd.local = pRot;
            sd.cell = c;
            sd.shape = shapeType;
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
    float stickerIntensity;
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
    
    // --- 2. Independent Holographic Stickers (Physical Raised Film) ---
    // Can appear anywhere on the monolith and can overlap glyphs and quotes!
    StickerData stk = getSticker(pos);
    float stickerH = 0.0;
    if (stk.intensity > 0.01) {
        float stickerStep = smoothstep(0.015, -0.015, stk.dist) * 0.035;
        float stickerBevel = smoothstep(0.012, 0.0, abs(stk.dist)) * 0.012;
        
        // Micro-relief embossing of the holographic design on the foil film
        float embH = 0.0;
        if (stk.dist < 0.005) {
            vec2 qNorm = stk.local / max(0.1, stk.radius);
            vec2 emb = evalStickerEmblem(qNorm, stk.shape);
            embH = (emb.x + emb.y) * 0.006;
        }
        
        stickerH = stickerStep + stickerBevel + embH;
    }
    
    // --- 3. Rock Slab Micro-Grain (Affixed to Scrolling Material Space) ---
    float microGrain = noise2D(pos * 16.0) * 0.014;
    
    // --- 4. Interactive Tactile Cursor Deformation (Modifying Embossing) ---
    vec2 ptrDistVec = (uv - u_pointer) * vec2(aspect, 1.0);
    float ptrDist = length(ptrDistVec);
    float cursorIndent = -0.32 * exp(-(ptrDist * ptrDist) / 0.018);
    float ptrSpeed = length(u_pointer_vel);
    float wake = sin(ptrDist * 32.0 - u_time * 7.0) * exp(-ptrDist * 10.0) * ptrSpeed * 0.35;
    
    // Keystroke ripple / shockwave displacement
    vec2 kDiff = (uv - u_keystroke_pos) * vec2(aspect, 1.0);
    float kDist = length(kDiff);
    float ripple = sin(kDist * 32.0 - u_time * 8.0) * exp(-kDist * 4.0) * u_shockwave_intensity * 0.08;
    
    float totalH = 0.5 + glyphH + textH + stickerH + microGrain + cursorIndent + wake + ripple;
    
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
    sd.stickerIntensity = stk.intensity;
    return sd;
}

// --- Main Shading & Material Pipeline ---
void main() {
    vec2 uv = qt_TexCoord0;
    float aspect = u_resolution.x / max(1.0, u_resolution.y);
    
    SurfaceData surf = getSurface(uv);
    float h = surf.height;
    vec2 pos = surf.pos;
    
    // --- Normal Map via Central Differences of Height Field ---
    vec2 eps = vec2(1.2 / u_resolution.y, 0.0);
    float hL = getSurface(uv - eps.xy).height;
    float hR = getSurface(uv + eps.xy).height;
    float hD = getSurface(uv - eps.yx).height;
    float hU = getSurface(uv + eps.yx).height;
    
    vec3 N = normalize(vec3((hL - hR) * u_emboss_depth * 7.5, (hD - hU) * u_emboss_depth * 7.5, 1.0));
    
    // View vector
    vec3 V = normalize(vec3(0.5 - uv.x, 0.5 - uv.y, 1.4));
    
    // --- Material Phase Mapping (Affixed to Scrolling Material Space) ---
    // The material textures move in lockstep with the glyphs and stone slab!
    vec2 matCoord = pos * 0.42 + vec2(u_time * 0.008, u_time * 0.004);
    float warp = noise2D(matCoord * 2.0);
    float phaseNoise = noise2D(matCoord + vec2(warp * 0.42, -warp * 0.32)) * 0.5 + 0.5;
    float phaseAux   = noise2D(matCoord * 1.6 + vec2(19.2, 54.7)) * 0.5 + 0.5;
    
    // Shifting material weights:
    // Matte Stone / Slate vs. Vitreous Porcelain (SSS) vs. Iridescent Thin-Film Sheen
    float wMatte      = smoothstep(0.48, 0.22, phaseNoise);
    float wPorcelain  = smoothstep(0.20, 0.45, phaseNoise) * smoothstep(0.80, 0.58, phaseNoise);
    float wIridescent = smoothstep(0.55, 0.78, phaseNoise);
    
    // --- Directional Ambient & Key Light (Soft, Elegant, No Blinding Glare) ---
    float lightAng = u_time * 0.32;
    vec3 L_key = normalize(vec3(cos(lightAng) * 0.55 - 0.25, sin(lightAng) * 0.45 + 0.4, 0.85));
    vec3 H_key = normalize(L_key + V);
    
    // Ambient Occlusion in carved/sunken crevices
    float ao = clamp(smoothstep(-0.06, 0.03, surf.glyphDist) * 0.45 + 0.55, 0.0, 1.0);
    
    // --- Shading Phase 1: Matte Bas-Relief Stone / Basalt ---
    float diffKey = max(0.0, dot(N, L_key));
    float diffuse = (diffKey * 0.75 + 0.25) * ao;
    vec3 colMatte = u_color_stone.rgb * diffuse;
    
    // --- Shading Phase 2: Translucent Porcelain & Subsurface Scattering (SSS) ---
    // Subsurface glow: light bleeding through thin carved edges
    float sssThickness = clamp((1.0 - h) * 1.6 + smoothstep(-0.02, 0.06, surf.glyphDist) * 0.5, 0.0, 1.0);
    float sssKey = pow(clamp(dot(V, -L_key + N * 0.35), 0.0, 1.0), 3.5) * exp(-sssThickness * 2.5);
    float sssTotal = sssKey * 1.6;
    
    // Vitreous glossy clearcoat highlight (very low roughness)
    float specKeyGloss = pow(max(0.0, dot(N, H_key)), 96.0);
    float fresnelGlaze = pow(1.0 - max(0.0, dot(N, V)), 4.0);
    vec3 colPorcelain = mix(u_color_porcelain.rgb * (diffuse * 0.8 + 0.2), vec3(1.0), fresnelGlaze * 0.5) 
                        + u_color_sheen.rgb * sssTotal * 0.6
                        + vec3(1.0) * specKeyGloss * 0.75;
    
    // --- Shading Phase 3a: Thin-Film Iridescent Interference (Wave Optics) ---
    float cosTheta = max(0.0, dot(N, V));
    float filmThickness = 380.0 + 340.0 * sin(phaseAux * 6.28318 + u_time * 0.15);
    float opd = 2.0 * 1.48 * filmThickness * sqrt(max(0.01, 1.0 - (1.0 - cosTheta * cosTheta) / (1.48 * 1.48)));
    vec3 lambda = vec3(650.0, 530.0, 440.0);
    vec3 iridSpectrum = 0.5 + 0.5 * cos(6.28318 * (opd / lambda));
    float iridFresnel = pow(1.0 - cosTheta, 2.5);
    vec3 colIridescent = mix(u_color_stone.rgb * diffuse, iridSpectrum * u_color_sheen.rgb * 1.8, iridFresnel * u_iridescence_strength);
    colIridescent += iridSpectrum * specKeyGloss * 1.1;
    
    // --- Composite Base Surface Material ---
    vec3 finalColor = colMatte * wMatte + colPorcelain * wPorcelain + colIridescent * wIridescent;
    
    // --- Shading Phase 4: Microflake Metallic Glitter & Glints (Affixed to Material Space) ---
    // The microflakes scroll in lockstep with the material pos!
    vec2 flakeCoord = pos * 26.0;
    vec2 flakeCell = floor(flakeCoord);
    vec2 flakeLocal = fract(flakeCoord) - 0.5;
    float flakeHash = hash12(flakeCell);
    
    float glitterMask = step(1.0 - (u_glitter_density * 0.42), flakeHash);
    if (glitterMask > 0.0) {
        vec2 flakeTilt = hash22(flakeCell) * 0.65;
        vec3 N_flake = normalize(N + vec3(flakeTilt, 0.0));
        
        float glintKey = pow(max(0.0, dot(N_flake, H_key)), 140.0);
        float glintSpot = smoothstep(0.48, 0.0, length(flakeLocal));
        float glintIntensity = glintKey * glintSpot * glitterMask * 1.8;
        
        vec3 glintColor = mix(u_color_gold.rgb, vec3(1.0), 0.65) * glintIntensity;
        finalColor += glintColor;
    }
    
    // --- Shading Phase 5: Gilded Inlay on Embossed Ridges ---
    if (surf.glyphDist < -0.015 && surf.glyphEmbossSign > 0.0) {
        float goldMask = smoothstep(-0.015, -0.045, surf.glyphDist);
        float goldSpec = pow(max(0.0, dot(N, H_key)), 48.0) * 0.8;
        vec3 goldShade = u_color_gold.rgb * (diffuse * 0.6 + 0.4) + u_color_gold.rgb * goldSpec * 1.4;
        finalColor = mix(finalColor, goldShade, goldMask * 0.5);
    }
    
    // --- Shading Phase 6: Independent Holographic CD-Diffraction Stickers ---
    // Physical metallic holographic foil stickers affixed to the monolith.
    // Independent from glyphs and can overlap glyphs and quotes!
    if (surf.stickerIntensity > 0.01 && surf.stickerDist < 0.018) {
        float stickerMask = smoothstep(0.008, -0.008, surf.stickerDist);
        float holoPwr = surf.stickerIntensity;
        
        // Local normalized sticker coordinates & procedural geometric emblem evaluation
        vec2 qSticker = surf.stickerLocal / max(0.1, surf.stickerRadius);
        vec2 emblem = evalStickerEmblem(qSticker, surf.stickerShape);
        float totalEmblem = clamp(emblem.x + emblem.y, 0.0, 1.0);
        
        // CD-ROM concentric circular diffraction tracks centered on the sticker
        vec2 dTrack = surf.stickerLocal;
        float rTrack = length(dTrack);
        vec3 T_disc = normalize(vec3(-dTrack.y, dTrack.x, 0.001));
        
        // Channel A Tangent Frame (Concentric circular grooves)
        vec3 T_cdA = normalize(T_disc - N * dot(N, T_disc));
        vec3 B_cdA = normalize(cross(N, T_cdA));
        
        float u_cdA = dot(T_cdA, L_key - V);
        float v_cdA = dot(B_cdA, H_key);
        
        float cdPhaseA = u_cdA * 26.0 + rTrack * 16.0 + u_time * 0.18;
        vec3 cdRainbowA = 0.5 + 0.5 * cos(6.28318 * (cdPhaseA + vec3(0.0, 0.33, 0.67)));
        float cdFanA = exp(-(v_cdA * v_cdA) / (2.0 * 0.045 * 0.045)) * pow(max(0.0, dot(N, H_key)), 14.0);
        
        // Channel B Tangent Frame (Orthogonal kinetic color-flip grating)
        vec3 T_cdB = B_cdA;
        vec3 B_cdB = -T_cdA;
        
        float u_cdB = dot(T_cdB, L_key - V);
        float v_cdB = dot(B_cdB, H_key);
        
        float cdPhaseB = u_cdB * 26.0 + rTrack * 22.0 + 1.5708 + u_time * 0.18;
        vec3 cdRainbowB = 0.5 + 0.5 * cos(6.28318 * (cdPhaseB + vec3(0.0, 0.33, 0.67)));
        float cdFanB = exp(-(v_cdB * v_cdB) / (2.0 * 0.045 * 0.045)) * pow(max(0.0, dot(N, H_key)), 14.0);
        
        float cdBroad = pow(max(0.0, dot(N, H_key)), 34.0) * 0.6;
        
        // Cut-edge bevel glint and drop shadow
        float edgeGlint = pow(max(0.0, dot(N, H_key)), 36.0) * smoothstep(0.02, 0.0, abs(surf.stickerDist)) * 1.4;
        float edgeShadow = smoothstep(-0.005, 0.02, surf.stickerDist) * smoothstep(0.035, 0.01, surf.stickerDist) * 0.45;
        
        // Metallic foil substrate (silver chrome or royal gold foil)
        float isGoldFoil = step(0.48, hash12(surf.stickerCell * 19.3));
        vec3 foilMetal = mix(vec3(0.92, 0.94, 0.97), u_color_gold.rgb * 1.35, isGoldFoil);
        float foilSpec = pow(max(0.0, dot(N, H_key)), 42.0) * 0.85;
        vec3 colFoil = foilMetal * (diffuse * 0.35 + 0.65) * (1.0 - edgeShadow) + foilMetal * foilSpec;
        
        // Negative space security watermark: subtle micro-dot lattice in background foil
        float microDots = step(0.65, sin(qSticker.x * 85.0) * sin(qSticker.y * 85.0)) * 0.16;
        colFoil += cdRainbowA * microDots * 0.35 * holoPwr;
        
        // Kinetic holographic emblem illumination
        vec3 lightA = cdRainbowA * (cdFanA * 5.2 + cdBroad * 1.4) * holoPwr;
        vec3 lightB = cdRainbowB * (cdFanB * 5.2 + cdBroad * 1.4) * holoPwr;
        float emblemGlint = pow(max(0.0, dot(N, H_key)), 110.0) * 2.0;
        
        vec3 colEmblem = (lightA + vec3(emblemGlint)) * emblem.x +
                         (lightB + vec3(emblemGlint)) * emblem.y;
        
        // High-contrast composite: crisp emblem atop metallic foil base
        vec3 colSticker = mix(colFoil, colFoil * 0.25 + colEmblem, totalEmblem);
        
        // High-gloss clearcoat & Fresnel rim glaze
        float stickerGloss = pow(max(0.0, dot(N, H_key)), 220.0) * 2.4;
        float stickerFresnel = pow(1.0 - max(0.0, dot(N, V)), 3.5);
        
        colSticker += vec3(1.0) * stickerGloss;
        colSticker = mix(colSticker, vec3(1.0), stickerFresnel * 0.35);
        colSticker += vec3(1.0) * edgeGlint;
        
        finalColor = mix(finalColor, colSticker, stickerMask);
    }
    
    // --- Active Keystroke Shockwave & Energy Vein Glow ---
    if (u_keystroke_energy > 0.01) {
        float kPulse = sin(surf.glyphDist * 40.0 - u_time * 12.0) * 0.5 + 0.5;
        float energyVein = smoothstep(0.04, -0.02, surf.glyphDist) * u_keystroke_energy * kPulse;
        finalColor += u_color_sheen.rgb * energyVein * 1.4;
    }
    
    // Subtle cinematic vignette
    vec2 vigUV = uv * (1.0 - uv.yx);
    float vignette = clamp(vigUV.x * vigUV.y * 22.0, 0.0, 1.0);
    finalColor = mix(u_color_void.rgb, finalColor, vignette);
    
    fragColor = vec4(finalColor, 1.0) * qt_Opacity;
}
