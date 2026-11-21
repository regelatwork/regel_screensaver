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
    vec4 u_color_sky;            // 128..143 (Sky zenith / night color)
    vec4 u_color_foliage;        // 144..159 (Pine needles & meadow grass)
    vec4 u_color_sun_moon;       // 160..175 (Sun & Moon core glow)
    vec4 u_color_wisp;           // 176..191 (Will-o'-the-Wisp companion light)
    float u_time;                // 192..195
    float u_keystroke_energy;    // 196..199
    float u_shockwave_intensity; // 200..203 (Frost freeze / cold blast)
    float u_vortex_speed;        // 204..207 (Wind speed / dawn blast / backspace gust)
    float u_bass;                // 208..211 (Foliage sway & wind gusts)
    float u_mids;                // 212..215 (Firefly drift & pollen shimmer)
    float u_treble;              // 216..219 (Bioluminescent flower sparkle)
    float u_solar_time;          // 220..223 (0.0 to 24.0 solar hours)
    vec2 u_wind_vector;          // 224..231 (Wind direction & speed)
    float u_weather_mode;        // 232..235 (0=Clear, 1=Rain, 2=Snow, 3=Mist)
    float u_lunar_phase;         // 236..239 (0.0=New Moon, 0.5=Full Moon, 1.0=New)
    float u_fog_density;         // 240..243 (Valley mist / fog)
    float u_frost_amount;        // 244..247 (Frost crystallization)
    float u_pad1;                // 248..251
    float u_pad2;                // 252..255
};

const float PI = 3.14159265;
const float TAU = 6.28318530;

// ----------------------------------------------------------------------------
// Precision-Safe Sine-Free Hash & Value/Ridged FBM Noise
// ----------------------------------------------------------------------------
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

// Smooth value noise in [0, 1]
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

// Positive 4-octave FBM in [0, 1]
float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
    for (int i = 0; i < 4; ++i) {
        v += a * vnoise(p);
        p = rot * p * 2.03 + vec2(17.1, 31.7);
        a *= 0.5;
    }
    return v;
}

// Positive 5-octave FBM for crisp sculpted clouds
float fbm5(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
    for (int i = 0; i < 5; ++i) {
        v += a * vnoise(p);
        p = rot * p * 2.02 + vec2(13.7, 29.3);
        a *= 0.5;
    }
    return v;
}

// Ridged multifractal noise in [0, 1] for craggy alpine peaks & ice crystals
float ridgedFbm(vec2 p) {
    float v = 0.0;
    float a = 0.55;
    float weight = 1.0;
    mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
    for (int i = 0; i < 4; ++i) {
        float n = 1.0 - abs(vnoise(p) * 2.0 - 1.0);
        n = n * n * weight;
        weight = clamp(n * 1.8, 0.0, 1.0);
        v += n * a;
        p = rot * p * 2.15 + vec2(7.3, 19.1);
        a *= 0.48;
    }
    return clamp(v, 0.0, 1.0);
}

// Tapered capsule SDF for organic branching limbs
float sdCapsuleTapered(vec2 p, vec2 a, vec2 b, float r1, float r2) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-5), 0.0, 1.0);
    float r = mix(r1, r2, h);
    return length(pa - ba * h) - r;
}

// Smooth minimum for organic bark joints & foliage lobes
float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

// ----------------------------------------------------------------------------
// Terrain Height Functions (shared by direct render & lake reflection)
// ----------------------------------------------------------------------------
float getDistantPeakHeight(float x) {
    // Dramatic twin alpine massifs framing the left and right, dipping to a scenic central saddle
    float leftMassif  = 0.24 * exp(-pow((x + 0.62) * 1.9, 2.0));
    float rightMassif = 0.27 * exp(-pow((x - 0.58) * 1.75, 2.0));
    float farSpire    = 0.14 * exp(-pow((x + 0.24) * 3.1, 2.0));
    float ridge = ridgedFbm(vec2(x * 1.85 + 2.4, 1.7));
    float crags = ridgedFbm(vec2(x * 5.2 + 0.9, 4.3)) * 0.045;
    return -0.05 + (leftMassif + rightMassif + farSpire + 0.06) * (0.62 + 0.55 * ridge) + crags;
}

// Smooth macro silhouette of mid-ground rolling hills (no vertical striping!)
float getMidRidgeMacro(float x) {
    float leftHill  = 0.13 * exp(-pow((x + 0.72) * 1.45, 2.0));
    float rightHill = 0.12 * exp(-pow((x - 0.74) * 1.40, 2.0));
    float gentleWave = 0.055 * fbm(vec2(x * 1.35 + 6.2, 4.1));
    return -0.145 + leftHill + rightHill + gentleWave;
}

float getMidRidgeHeight(float x) {
    float macro = getMidRidgeMacro(x);
    // Organic irregular conifer/forest canopy edge (no uniform periodic sawtooth)
    float clump1 = vnoise(vec2(x * 19.0 + 3.1, 2.0));
    float clump2 = vnoise(vec2(x * 47.0 + 7.4, 5.3));
    float spire  = vnoise(vec2(x * 105.0 + 1.2, 8.7));
    float trees = (clump1 * 0.48 + clump2 * 0.34 + spire * 0.18) * 0.024;
    return macro + trees;
}

float getPromontoryHeight(float x) {
    // Mossy headland jutting into the alpine lake from left-center + flanking banks
    float mound = -0.355 + 0.175 * exp(-pow((x + 0.15) * 2.05, 2.0));
    float leftBank = -0.305 + 0.135 * smoothstep(-0.22, -0.95, x);
    float rightBank = -0.365 + 0.125 * smoothstep(0.28, 0.95, x);
    float h = max(mound, max(leftBank, rightBank));
    h += (fbm(vec2(x * 3.2 + 1.5, 5.2)) - 0.5) * 0.022;
    return h;
}

// ----------------------------------------------------------------------------
// Atmospheric Sky & Sculpted Studio Ghibli Cumulus Clouds
// ----------------------------------------------------------------------------
vec3 evaluateSky(
    vec2 dirP,
    vec2 sunPos,
    vec2 moonPos,
    float sunElev,
    float dayFactor,
    float twilightFactor,
    float nightFactor,
    float overcast,
    float t,
    vec2 windDir,
    bool includeStarsAndMoon
) {
    float skyY = clamp((dirP.y + 0.14) * 1.45, 0.0, 1.0);

    // Subtle palette tinting so each of the 5 themes has its own atmospheric personality
    vec3 palSky = u_color_sky.rgb;
    float palLuma = dot(palSky, vec3(0.299, 0.587, 0.114));
    vec3 palTint = mix(vec3(1.0), palSky / max(palLuma, 0.08), 0.16);

    // Day sky: rich Ghibli cerulean zenith -> luminous turquoise-azure -> airy warm horizon
    vec3 dayZenith  = vec3(0.10, 0.34, 0.78) * mix(vec3(1.0), palTint, 0.30);
    vec3 dayMid     = vec3(0.32, 0.64, 0.94);
    vec3 dayHorizon = vec3(0.81, 0.92, 0.98);
    vec3 skyDay = mix(dayHorizon, dayMid, smoothstep(0.0, 0.40, skyY));
    skyDay = mix(skyDay, dayZenith, smoothstep(0.30, 1.0, skyY));

    // Dawn / Golden Hour sky: indigo-violet zenith -> rose-coral -> glowing apricot horizon
    vec3 twiZenith  = vec3(0.15, 0.14, 0.36);
    vec3 twiMid     = vec3(0.74, 0.36, 0.44);
    vec3 twiHorizon = vec3(1.00, 0.67, 0.34);
    vec3 skyTwi = mix(twiHorizon, twiMid, smoothstep(0.0, 0.38, skyY));
    skyTwi = mix(skyTwi, twiZenith, smoothstep(0.35, 1.0, skyY));

    // Night sky: velvety obsidian-indigo anchored to u_color_sky
    vec3 nightZenith  = palSky * 0.45 + vec3(0.008, 0.014, 0.032);
    vec3 nightHorizon = palSky * 1.45 + vec3(0.04, 0.07, 0.14);
    vec3 skyNight = mix(nightHorizon, nightZenith, smoothstep(0.0, 0.85, skyY));

    vec3 sky = mix(skyNight, skyDay, dayFactor);
    sky = mix(sky, skyTwi, twilightFactor * 0.88);

    // Overcast storm tint during rain/mist
    vec3 overcastCol = mix(vec3(0.08, 0.11, 0.16), vec3(0.45, 0.52, 0.60), dayFactor);
    sky = mix(sky, overcastCol, overcast * 0.55);

    // Mie forward scattering around the Sun
    float sunDist = length(dirP - sunPos);
    if (sunElev > -0.22) {
        float sunVis = smoothstep(-0.22, 0.05, sunElev);
        vec3 sunWarm = mix(u_color_sun_moon.rgb, vec3(1.0, 0.97, 0.88), 0.55);
        sunWarm = mix(sunWarm, vec3(1.0, 0.50, 0.18), twilightFactor * 0.75);
        float mieWide = exp(-sunDist * 2.4) * (0.26 + twilightFactor * 0.46) * (1.0 - overcast * 0.5);
        float mieTight = exp(-sunDist * 9.5) * (0.52 + u_bass * 0.15) * (1.0 - overcast * 0.65);
        sky += sunWarm * (mieWide + mieTight) * sunVis;
    }

    // Crisp Circular Sub-Pixel Starfield & Milky Way Ribbon (night & deep twilight)
    if (includeStarsAndMoon && nightFactor > 0.04 && overcast < 0.85) {
        float starFade = nightFactor * smoothstep(-0.08, 0.18, dirP.y) * (1.0 - overcast * 0.75);

        vec2 mwUV = mat2(0.84, -0.54, 0.54, 0.84) * (dirP - vec2(0.0, 0.18));
        float mwBand = exp(-pow(mwUV.y * 4.5, 2.0));
        float mwNoise = fbm(mwUV * vec2(3.2, 6.5) + vec2(1.4, 2.1));
        float mwDust = smoothstep(0.32, 0.72, mwNoise) * mwBand;
        vec3 mwCol = mix(vec3(0.18, 0.28, 0.52), vec3(0.55, 0.42, 0.68), vnoise(mwUV * 4.0));
        sky += mwCol * mwDust * 0.28 * starFade;

        for (int layer = 0; layer < 3; ++layer) {
            float scale = (layer == 0) ? 24.0 : ((layer == 1) ? 46.0 : 84.0);
            vec2 sp = dirP * scale + vec2(float(layer) * 19.3, float(layer) * 7.1);
            vec2 cell = floor(sp);
            vec2 f = fract(sp);
            vec2 rnd = hash22(cell);
            float chance = hash12(cell + 11.7);
            float thresh = (layer == 0) ? 0.88 : ((layer == 1) ? 0.86 : 0.84);
            if (chance > thresh) {
                vec2 center = 0.18 + 0.64 * rnd;
                float d = length(f - center);
                float radius = mix(0.042, 0.105, (chance - thresh) / (1.0 - thresh));
                float core = smoothstep(radius, radius * 0.15, d);
                float halo = exp(-d * 14.0) * 0.32;
                float twinkle = 0.68 + 0.32 * sin(mod(t * (2.2 + rnd.x * 3.0) + rnd.y * TAU, TAU));
                vec3 starTint = mix(vec3(0.78, 0.88, 1.0), vec3(1.0, 0.93, 0.80), rnd.x);
                float bright = (layer == 0) ? 1.15 : ((layer == 1) ? 0.80 : 0.52);
                sky += starTint * (core + halo) * twinkle * bright * starFade;
            }
        }
    }

    // Sun Disc
    if (sunElev > -0.12 && overcast < 0.8) {
        float sunDisc = smoothstep(0.039, 0.032, sunDist);
        vec3 discCol = mix(vec3(1.0, 0.98, 0.92), vec3(1.0, 0.72, 0.38), twilightFactor * 0.7);
        sky += discCol * sunDisc * (1.8 * (1.0 - overcast * 0.65));
    }

    // Physically Shaded Lunar Disc & Unclipped Atmospheric Halo
    if (includeStarsAndMoon && sunElev < 0.25) {
        float moonVis = smoothstep(0.25, -0.10, sunElev) * (1.0 - overcast * 0.55);
        float moonDist = length(dirP - moonPos);
        float moonR = 0.040;

        vec3 moonGlowCol = mix(vec3(0.68, 0.82, 1.0), u_color_sun_moon.rgb, 0.35);
        sky += moonGlowCol * exp(-moonDist * 8.5) * 0.34 * moonVis;

        if (moonDist < moonR + 0.006) {
            float discMask = smoothstep(moonR, moonR - 0.0028, moonDist);
            vec2 ml = (dirP - moonPos) / moonR;
            float r2 = dot(ml, ml);
            float z = sqrt(max(0.0, 1.0 - r2));
            vec3 n = vec3(ml, z);

            float phaseAng = u_lunar_phase * TAU;
            vec3 lightDir = normalize(vec3(sin(phaseAng), 0.16, -cos(phaseAng)));
            float lit = smoothstep(-0.07, 0.14, dot(n, lightDir));

            float maria = fbm(ml * 3.2 + vec2(1.7, 0.9));
            vec3 litSurface = mix(vec3(0.76, 0.80, 0.86), vec3(0.97, 0.97, 0.94), smoothstep(0.32, 0.68, maria));
            litSurface = mix(litSurface, u_color_sun_moon.rgb, 0.18);
            vec3 earthshine = mix(sky, vec3(0.10, 0.14, 0.22), 0.55);

            sky = mix(sky, mix(earthshine, litSurface, lit), discMask * moonVis);
        }
    }

    // ------------------------------------------------------------------------
    // Crisp, Sculpted Studio Ghibli Cumulus Clouds
    // ------------------------------------------------------------------------
    if (dirP.y > -0.05) {
        vec2 drift = windDir * mod(t * 0.016, 64.0);

        // Layer A: High delicate cirrus streaks
        vec2 cirrusP = vec2(dirP.x * 1.45 - drift.x * 0.55, dirP.y * 4.5 + 0.4);
        float cirrus = smoothstep(0.58, 0.82, fbm(cirrusP)) * smoothstep(0.08, 0.28, dirP.y) * smoothstep(0.54, 0.32, dirP.y);
        vec3 cirrusCol = mix(vec3(0.26, 0.32, 0.46), vec3(1.0, 0.98, 0.96), dayFactor);
        cirrusCol = mix(cirrusCol, vec3(1.0, 0.74, 0.56), twilightFactor * 0.85);
        sky = mix(sky, cirrusCol, cirrus * (0.30 + overcast * 0.22));

        // Layer B: Billowing sculpted Ghibli cumulus towers
        vec2 cUV = vec2(dirP.x * 1.55 - drift.x * 1.2, dirP.y * 2.55 - 0.06);
        vec2 warp = vec2(fbm(cUV * 1.6 + vec2(3.1, 1.2)), fbm(cUV * 1.6 + vec2(8.4, 5.7))) - 0.5;
        float baseDensity = fbm5(cUV + warp * 0.48);

        // Flat base, billowy upper puffs
        float heightEnv = smoothstep(0.00, 0.08, dirP.y) * smoothstep(0.47, 0.16, dirP.y);
        float shaped = baseDensity * (0.76 + 0.48 * heightEnv);
        float coverage = mix(0.52, 0.38, overcast);
        // Crisp painterly cumulus edge
        float cloudAlpha = smoothstep(coverage, coverage + 0.095, shaped) * heightEnv;

        if (cloudAlpha > 0.005) {
            vec2 lightPos = (dayFactor > 0.25) ? sunPos : moonPos;
            vec2 toLight = normalize(lightPos - dirP);
            float sampleTowardLight = fbm5(cUV + warp * 0.48 + toLight * vec2(0.08, 0.13));
            float selfLit = clamp((baseDensity - sampleTowardLight) * 5.2 + 0.52 + (dirP.y - 0.10) * 1.45, 0.0, 1.0);

            vec3 cloudLitDay = vec3(1.00, 0.99, 0.95);
            vec3 cloudMidDay = vec3(0.78, 0.86, 0.95);
            vec3 cloudShdDay = vec3(0.42, 0.55, 0.78);

            vec3 cloudLitTwi = vec3(1.00, 0.78, 0.48);
            vec3 cloudMidTwi = vec3(0.82, 0.46, 0.48);
            vec3 cloudShdTwi = vec3(0.32, 0.22, 0.42);

            vec3 cloudLitNgt = vec3(0.24, 0.32, 0.46);
            vec3 cloudMidNgt = vec3(0.13, 0.18, 0.28);
            vec3 cloudShdNgt = vec3(0.05, 0.08, 0.15);

            vec3 cLit = mix(mix(cloudLitNgt, cloudLitDay, dayFactor), cloudLitTwi, twilightFactor * 0.88);
            vec3 cMid = mix(mix(cloudMidNgt, cloudMidDay, dayFactor), cloudMidTwi, twilightFactor * 0.88);
            vec3 cShd = mix(mix(cloudShdNgt, cloudShdDay, dayFactor), cloudShdTwi, twilightFactor * 0.88);

            cLit = mix(cLit, vec3(0.56, 0.61, 0.69) * (0.25 + 0.75 * dayFactor), overcast * 0.55);
            cShd = mix(cShd, vec3(0.17, 0.21, 0.29) * (0.3 + 0.7 * dayFactor), overcast * 0.65);

            // Painterly 3-tone cumulus shading
            vec3 cloudCol = mix(cShd, cMid, smoothstep(0.22, 0.52, selfLit));
            cloudCol = mix(cloudCol, cLit, smoothstep(0.50, 0.82, selfLit));

            // Warm sunlit silver-lining rim
            float silverRim = exp(-sunDist * 3.8) * (1.0 - cloudAlpha * 0.35) * smoothstep(-0.1, 0.2, sunElev);
            cloudCol += mix(vec3(1.0, 0.93, 0.78), vec3(1.0, 0.62, 0.30), twilightFactor) * silverRim * 0.60;

            sky = mix(sky, cloudCol, cloudAlpha * 0.93);
        }
    }

    return sky;
}

// ----------------------------------------------------------------------------
// Main Fragment Shader
// ----------------------------------------------------------------------------
void main() {
    vec2 uv = qt_TexCoord0;
    float aspect = u_resolution.x / max(u_resolution.y, 1.0);
    vec2 p = vec2(uv.x - 0.5, 0.5 - uv.y) * vec2(aspect, 1.0);

    float t = mod(u_time, 3600.0);
    float windSpeed = (0.45 + length(u_wind_vector) * 1.2 + u_bass * 1.4) * max(0.25, abs(u_vortex_speed));
    vec2 windDir = normalize(u_wind_vector + vec2(0.85, 0.12));

    float isRain = smoothstep(0.5, 0.9, u_weather_mode) * (1.0 - smoothstep(1.1, 1.5, u_weather_mode));
    float isSnow = smoothstep(1.5, 1.9, u_weather_mode) * (1.0 - smoothstep(2.1, 2.5, u_weather_mode));
    float isMist = smoothstep(2.5, 2.9, u_weather_mode);
    float overcast = clamp(isRain * 0.75 + isSnow * 0.35 + isMist * 0.45, 0.0, 1.0);

    // ------------------------------------------------------------------------
    // 1. Astronomical Ephemeris & Lighting Regime
    // ------------------------------------------------------------------------
    float solarHour = mod(u_solar_time, 24.0);
    float solarRad = (solarHour - 6.0) / 12.0 * PI;
    float sunElev = sin(solarRad);
    float sunAzi = -cos(solarRad) * 0.46 * aspect;

    vec2 sunPos = vec2(sunAzi, sunElev * 0.36 + 0.05);
    vec2 moonPos = vec2(-sunAzi, -sunElev * 0.36 + 0.06);

    float dayFactor = smoothstep(-0.18, 0.28, sunElev);
    float twilightFactor = smoothstep(0.36, -0.02, abs(sunElev)) * smoothstep(-0.34, -0.02, sunElev);
    float nightFactor = 1.0 - smoothstep(-0.20, 0.12, sunElev);

    vec2 keyLightPos = mix(moonPos, sunPos, dayFactor);
    vec3 keyLightCol = mix(vec3(0.55, 0.72, 0.98), vec3(1.0, 0.96, 0.86), dayFactor);
    keyLightCol = mix(keyLightCol, vec3(1.0, 0.58, 0.28), twilightFactor * 0.85);
    vec3 ambientShadowCol = mix(vec3(0.05, 0.09, 0.18), vec3(0.22, 0.34, 0.56), dayFactor);
    ambientShadowCol = mix(ambientShadowCol, vec3(0.26, 0.18, 0.34), twilightFactor * 0.75);

    vec3 hazeCol = mix(u_color_sky.rgb * 1.45 + vec3(0.04, 0.07, 0.13), vec3(0.72, 0.85, 0.96), dayFactor);
    hazeCol = mix(hazeCol, vec3(0.95, 0.62, 0.40), twilightFactor * 0.82);
    hazeCol = mix(hazeCol, mix(vec3(0.10, 0.13, 0.18), vec3(0.50, 0.56, 0.62), dayFactor), overcast * 0.5);

    // ------------------------------------------------------------------------
    // 2. Sky Dome & Sculpted Clouds
    // ------------------------------------------------------------------------
    vec3 sceneColor = evaluateSky(
        p, sunPos, moonPos, sunElev, dayFactor, twilightFactor, nightFactor,
        overcast, t, windDir, true
    );

    // ------------------------------------------------------------------------
    // 3. Layer 1: Distant Snow-Capped Alpine Peaks (2D Ridged Facets, No Seams)
    // ------------------------------------------------------------------------
    float mtn1H = getDistantPeakHeight(p.x);
    if (p.y < mtn1H + 0.008) {
        float mtn1Mask = smoothstep(mtn1H + 0.0035, mtn1H - 0.0035, p.y);
        // Smooth 2D alpine ridge heightfield for diagonal rocky faces & sunlit gullies
        vec2 mUV = vec2(p.x * 4.2 + 1.3, p.y * 6.5 + 2.1);
        float hC = ridgedFbm(mUV);
        float hX = ridgedFbm(mUV + vec2(0.08, 0.0));
        float hY = ridgedFbm(mUV + vec2(0.0, 0.08));
        vec3 mNormal = normalize(vec3((hC - hX) * 6.0, (hC - hY) * 4.0 + 0.35, 0.65));
        vec3 lightDir3 = normalize(vec3(keyLightPos.x - p.x, max(keyLightPos.y - p.y, 0.18), 0.55));
        float facetLit = smoothstep(0.15, 0.82, dot(mNormal, lightDir3) * 0.5 + 0.5);

        vec3 rockShadow = mix(vec3(0.07, 0.11, 0.21), vec3(0.24, 0.35, 0.52), dayFactor);
        vec3 rockLit    = mix(vec3(0.16, 0.23, 0.36), vec3(0.46, 0.55, 0.68), dayFactor);
        rockLit = mix(rockLit, vec3(0.74, 0.46, 0.42), twilightFactor * 0.68);
        vec3 mtn1Col = mix(rockShadow, rockLit, facetLit);

        // Snow caps clinging to upper ridges & sunlit alpine ledges (leaving rocky facets visible)
        float distFromCrest = mtn1H - p.y;
        float snowLine = 0.085 + 0.045 * vnoise(vec2(p.x * 5.5, 1.5)) - isSnow * 0.08;
        float snowMask = smoothstep(snowLine, snowLine + 0.065, p.y)
                       * smoothstep(0.11, 0.008, distFromCrest - hC * 0.055)
                       * smoothstep(0.32, 0.72, facetLit * 0.7 + hC * 0.45);
        vec3 snowCol = mix(vec3(0.32, 0.42, 0.60), vec3(0.97, 0.98, 1.0), dayFactor);
        snowCol = mix(snowCol, vec3(1.0, 0.79, 0.64), twilightFactor * 0.72);
        mtn1Col = mix(mtn1Col, snowCol, snowMask * 0.85);

        // Soft aerial perspective into the distant valley
        float aerialHaze = smoothstep(0.26, -0.14, p.y) * 0.55 + 0.14;
        mtn1Col = mix(mtn1Col, hazeCol, clamp(aerialHaze, 0.0, 0.80));

        sceneColor = mix(sceneColor, mtn1Col, mtn1Mask);
    }

    // ------------------------------------------------------------------------
    // 4. Layer 2: Mid-Ground Rolling Forested Hills & Pine Treeline (No Stripes!)
    // ------------------------------------------------------------------------
    float mtn2H = getMidRidgeHeight(p.x);
    if (p.y < mtn2H + 0.008) {
        float mtn2Mask = smoothstep(mtn2H + 0.0028, mtn2H - 0.0028, p.y);
        // Smooth macro slope ONLY (never derived from high-freq trees!)
        float macroC = getMidRidgeMacro(p.x);
        float macroR = getMidRidgeMacro(p.x + 0.04);
        float macroSlope = (macroR - macroC) / 0.04;
        float sunBias = clamp((keyLightPos.x - p.x) * 2.5, -1.0, 1.0);
        float hillLit = smoothstep(-0.35, 0.45, -macroSlope * sunBias + 0.18);

        // Soft 2D forest canopy clumps (organic foliage texture, zero vertical streaks)
        float canopyTex = fbm(vec2(p.x * 11.0 + 2.1, p.y * 16.0 + 3.7));
        float crestDepth = clamp((macroC - p.y) / 0.16, 0.0, 1.0);

        vec3 forestDark = mix(vec3(0.03, 0.07, 0.13), u_color_foliage.rgb * 0.32 + ambientShadowCol * 0.18, dayFactor);
        vec3 forestLit  = mix(vec3(0.07, 0.14, 0.21), u_color_foliage.rgb * 0.78, dayFactor);
        forestLit = mix(forestLit, forestLit * 0.72 + keyLightCol * 0.30, twilightFactor * 0.62);

        // Sunlit forest tops grading down into cool shaded valley floor
        float shadeMix = clamp(hillLit * (0.45 + 0.55 * canopyTex) * (1.0 - crestDepth * 0.45), 0.0, 1.0);
        vec3 mtn2Col = mix(forestDark, forestLit, shadeMix);

        // Snow dusting on conifer canopy in winter mode
        mtn2Col = mix(mtn2Col, vec3(0.78, 0.86, 0.96) * (0.28 + 0.72 * dayFactor), isSnow * smoothstep(0.45, 0.72, canopyTex) * 0.55);

        // Misty valley floor fade
        float baseHaze = smoothstep(-0.04, -0.18, p.y) * (0.42 + u_fog_density * 0.28);
        mtn2Col = mix(mtn2Col, hazeCol, clamp(baseHaze, 0.0, 0.76));

        sceneColor = mix(sceneColor, mtn2Col, mtn2Mask);
    }

    // ------------------------------------------------------------------------
    // 5. Layer 3: Tranquil Mirrored Alpine Lake
    // ------------------------------------------------------------------------
    float lakeLevel = -0.175;
    float promH = getPromontoryHeight(p.x);
    bool inLake = (p.y < lakeLevel) && (p.y >= promH - 0.004);

    if (p.y < lakeLevel + 0.005) {
        float lakeMask = smoothstep(lakeLevel + 0.0025, lakeLevel - 0.0025, p.y);
        float depth = clamp((lakeLevel - p.y) / 0.34, 0.0, 1.0);

        // Multi-frequency horizontal water ripples
        float wave1 = vnoise(vec2(p.x * 13.0 - t * windSpeed * 0.65, (p.y - lakeLevel) * 56.0 - t * 0.85));
        float wave2 = vnoise(vec2(p.x * 27.0 + t * 0.35, (p.y - lakeLevel) * 110.0 + t * 1.05));
        float ripple = (wave1 * 0.65 + wave2 * 0.35 - 0.5) * (0.016 + depth * 0.024);

        // Raindrop concentric rings on the lake surface
        float rainRing = 0.0;
        if (isRain > 0.05) {
            vec2 rGrid = vec2(p.x * 12.0, (p.y - lakeLevel) * 32.0);
            vec2 rCell = floor(rGrid);
            vec2 rF = fract(rGrid);
            vec2 rPos = 0.2 + 0.6 * hash22(rCell);
            float rPhase = fract(t * 1.2 + hash12(rCell + 5.1));
            float rDist = length((rF - rPos) * vec2(1.0, 1.8));
            rainRing = smoothstep(0.055, 0.0, abs(rDist - rPhase * 0.45)) * (1.0 - rPhase) * isRain;
            ripple += rainRing * 0.012;
        }

        // Mirrored reflection coordinates
        vec2 reflP = vec2(p.x + ripple * 1.35, lakeLevel + (lakeLevel - p.y) * 1.08 + ripple * 0.75);
        vec3 reflSky = evaluateSky(
            reflP, sunPos, moonPos, sunElev, dayFactor, twilightFactor, nightFactor,
            overcast, t, windDir, false
        );

        // Reflected distant mountains & forested hills in the lake
        float reflMtnH = getDistantPeakHeight(reflP.x);
        if (reflP.y < reflMtnH) {
            vec3 reflMtn = mix(vec3(0.05, 0.09, 0.16), vec3(0.24, 0.35, 0.50), dayFactor);
            reflSky = mix(reflSky, reflMtn, 0.50);
        }
        float reflHillH = getMidRidgeMacro(reflP.x);
        if (reflP.y < reflHillH) {
            vec3 reflHill = mix(vec3(0.03, 0.07, 0.12), u_color_foliage.rgb * 0.42, dayFactor);
            reflSky = mix(reflSky, reflHill, 0.65);
        }
        // Subtle bonsai canopy reflection shadow shimmering over the right-center water
        float treeReflDist = length((reflP - vec2(0.06, 0.12)) * vec2(2.6, 4.2));
        if (treeReflDist < 1.0) {
            vec3 treeReflCol = mix(vec3(0.02, 0.05, 0.08), u_color_foliage.rgb * 0.30, dayFactor);
            reflSky = mix(reflSky, treeReflCol, smoothstep(1.0, 0.35, treeReflDist) * 0.42);
        }

        vec3 waterDeep = mix(vec3(0.02, 0.05, 0.11), vec3(0.06, 0.24, 0.38), dayFactor);
        waterDeep = mix(waterDeep, vec3(0.18, 0.16, 0.26), twilightFactor * 0.55);
        float fresnel = mix(0.45, 0.80, pow(1.0 - depth, 1.55));
        vec3 waterCol = mix(waterDeep, reflSky, fresnel);

        // Shimmering vertical sun/moon glitter column across ripples
        float glitterX = abs(p.x - keyLightPos.x + ripple * 2.8);
        float glitterCol = exp(-glitterX * (13.0 - depth * 5.5)) * smoothstep(0.0, 0.10, depth);
        float glitterSparkle = smoothstep(0.45, 0.76, wave1 * 0.5 + wave2 * 0.5 + 0.12);
        waterCol += keyLightCol * glitterCol * (0.28 + 0.85 * glitterSparkle) * (1.0 - overcast * 0.65);

        // Raindrop ring highlight
        waterCol += vec3(0.72, 0.86, 0.96) * rainRing * (0.25 + 0.45 * dayFactor);

        // Soft shoreline mist along the far water margin
        float farEdge = smoothstep(0.018, 0.0, lakeLevel - p.y);
        waterCol = mix(waterCol, hazeCol, farEdge * 0.48);

        sceneColor = mix(sceneColor, waterCol, lakeMask);
    }

    // ------------------------------------------------------------------------
    // 6. Foreground Mossy Headland, Ancient Bonsai & Hanging Paper Lantern
    // ------------------------------------------------------------------------
    vec2 wispTarget = vec2((u_pointer.x - 0.5) * aspect, 0.5 - u_pointer.y);
    vec2 wispHover = vec2(sin(mod(t * 2.4, TAU)) * 0.014, cos(mod(t * 3.1, TAU)) * 0.016);
    vec2 wispPos = wispTarget + wispHover;
    vec3 wispColor = u_color_wisp.rgb;
    float wispVis = mix(0.48, 1.0, nightFactor + twilightFactor * 0.5);

    float swayPhase = mod(t * (1.2 + windSpeed * 0.55), TAU);
    float branchSway = sin(swayPhase) * (0.006 + u_bass * 0.014);
    float leafFlutter = sin(mod(t * 3.4 + p.x * 12.0, TAU)) * (0.002 + u_bass * 0.005);

    // Hanging paper lantern suspended from lower right cantilevered limb
    float lanternSwing = sin(mod(t * 2.1 + 0.7, TAU)) * (0.008 + u_bass * 0.015);
    vec2 lanternAnchor = vec2(0.11 + branchSway * 0.7, 0.055);
    vec2 lanternPos = lanternAnchor + vec2(lanternSwing, -0.055);
    float lanternGlowStrength = mix(1.0, 0.12, dayFactor) + twilightFactor * 0.58;
    vec3 lanternCol = vec3(1.0, 0.68, 0.24);

    // Warm lantern shimmer reflected in the lake directly below
    if (inLake && lanternGlowStrength > 0.1) {
        float lrX = abs(p.x - lanternPos.x + (vnoise(vec2(p.x * 18.0, p.y * 70.0 - t * 2.0)) - 0.5) * 0.032);
        float lrY = smoothstep(-0.17, -0.45, p.y);
        float lrGlow = exp(-lrX * 26.0) * (1.0 - lrY * 0.75) * lanternGlowStrength;
        sceneColor += lanternCol * lrGlow * 0.36;
    }

    // --- Foreground Mossy Headland & Meadow Banks (ZERO vertical stripes!) ---
    if (p.y < promH + 0.025) {
        // Delicate multi-frequency swaying meadow grass silhouette
        float grassPhase = mod(p.x * 48.0 - t * windSpeed * 2.2, TAU);
        float bend = sin(grassPhase) * 0.25;
        float bladeTuft = (vnoise(vec2(p.x * 52.0 + bend, 3.1)) * 0.55 + vnoise(vec2(p.x * 118.0 + bend * 1.4, 7.2)) * 0.45) * 0.013;
        float grassTop = promH + bladeTuft;
        float promMask = smoothstep(grassTop + 0.0022, grassTop - 0.0022, p.y);

        if (promMask > 0.001) {
            // Smooth depth computed from promH (NOT grassTop!) -> completely eliminates vertical banding!
            float depthIntoHill = clamp((promH - p.y) / 0.22, 0.0, 1.0);
            float windRipple = sin(mod(p.x * 14.0 - t * windSpeed * 2.2 + p.y * 11.0, TAU)) * 0.5 + 0.5;
            float mossTex = fbm(vec2(p.x * 10.0 + 1.2, p.y * 14.0 + 2.4));
            float fineGrass = vnoise(vec2(p.x * 45.0, p.y * 38.0));

            vec3 grassDark = mix(vec3(0.02, 0.05, 0.08), u_color_foliage.rgb * 0.26, dayFactor);
            vec3 grassMid  = mix(vec3(0.05, 0.12, 0.15), u_color_foliage.rgb * 0.88, dayFactor);
            vec3 grassSun  = mix(vec3(0.12, 0.22, 0.23), mix(u_color_foliage.rgb * 1.28, keyLightCol, 0.38), dayFactor);
            grassSun = mix(grassSun, grassSun * 0.7 + vec3(0.95, 0.52, 0.22) * 0.35, twilightFactor * 0.7);

            float crestLight = smoothstep(0.58, 0.0, depthIntoHill) * (0.50 + 0.50 * mossTex);
            vec3 hillCol = mix(grassDark, grassMid, smoothstep(0.92, 0.12, depthIntoHill) * (0.78 + 0.22 * fineGrass));
            hillCol = mix(hillCol, grassSun, crestLight * (0.62 + 0.38 * windRipple));

            // Sculpted mossy boulders at the bonsai base with directional shading & moss caps
            float rNoise = (fbm(p * 24.0) - 0.5) * 0.022;
            float rock1 = length((p - vec2(-0.19, -0.21)) * vec2(1.0, 1.85)) + rNoise;
            float rock2 = length((p - vec2(-0.01, -0.225)) * vec2(0.88, 1.95)) + rNoise;
            float rockDist = min(rock1, rock2);
            if (rockDist < 0.068) {
                float rockMask = smoothstep(0.066, 0.054, rockDist);
                float rockTop = smoothstep(-0.235, -0.185, p.y);
                vec3 stoneDark = mix(vec3(0.04, 0.06, 0.10), vec3(0.20, 0.23, 0.27), dayFactor);
                vec3 stoneLit  = mix(vec3(0.11, 0.15, 0.20), vec3(0.45, 0.47, 0.49), dayFactor);
                vec3 stoneCol  = mix(stoneDark, stoneLit, rockTop * (0.5 + 0.5 * mossTex));
                // Lush moss cap draped over top of boulders
                float mossCap = smoothstep(0.55, 0.88, rockTop + (mossTex - 0.5) * 0.45);
                stoneCol = mix(stoneCol, grassSun * 0.9, mossCap * 0.65);
                hillCol = mix(hillCol, stoneCol, rockMask * 0.92);
            }

            // Soft ambient occlusion shadow right beneath the bonsai trunk & canopy
            float trunkAO = exp(-pow((p.x + 0.10) * 6.5, 2.0) - pow((p.y + 0.215) * 18.0, 2.0));
            hillCol *= (1.0 - trunkAO * 0.42);

            // Snow dusting in winter mode
            hillCol = mix(hillCol, vec3(0.85, 0.92, 0.99) * (0.26 + 0.74 * dayFactor), isSnow * smoothstep(0.42, 0.0, depthIntoHill) * 0.78);

            // Dynamic point lighting from Wisp & Hanging Lantern on the meadow
            float dWispHill = length(p - wispPos);
            hillCol += wispColor * (0.011 / (dWispHill * dWispHill + 0.026)) * wispVis;
            float dLantHill = length(p - lanternPos);
            hillCol += lanternCol * (0.008 / (dLantHill * dLantHill + 0.022)) * lanternGlowStrength;

            // Sparkling bioluminescent meadow flowers (treble-reactive at dusk/night)
            vec2 flGrid = p * 26.0;
            vec2 flCell = floor(flGrid);
            vec2 flF = fract(flGrid);
            float flChance = hash12(flCell + 3.7);
            if (flChance > 0.85 && depthIntoHill > 0.05 && depthIntoHill < 0.75) {
                vec2 flCenter = 0.2 + 0.6 * hash22(flCell);
                float flD = length(flF - flCenter);
                float flDot = smoothstep(0.15, 0.02, flD);
                float flSparkle = 0.6 + 0.4 * sin(mod(t * 4.0 + flChance * TAU, TAU));
                vec3 flCol = mix(u_color_wisp.rgb, vec3(0.65, 1.0, 0.88), fract(flChance * 7.3));
                float flVis = (nightFactor * 0.85 + 0.15) * (0.50 + u_treble * 1.4);
                hillCol += flCol * flDot * flSparkle * flVis;
            }

            sceneColor = mix(sceneColor, hillCol, promMask);
        }
    }

    // --- Bonsai Gnarled Trunk & Sweeping Branches (continuous welded SDF) ---
    if (p.x > -0.52 && p.x < 0.42 && p.y > -0.26 && p.y < 0.42) {
        vec2 sw1 = vec2(branchSway * 0.35, 0.0);
        vec2 sw2 = vec2(branchSway * 0.75, 0.0);
        vec2 sw3 = vec2(branchSway * 1.10, 0.0);

        // Tapered root flare gripping into the mossy rocks
        float dTree = sdCapsuleTapered(p, vec2(-0.155, -0.228), vec2(-0.105, -0.172), 0.015, 0.022);
        dTree = smin(dTree, sdCapsuleTapered(p, vec2(-0.055, -0.232), vec2(-0.098, -0.170), 0.013, 0.020), 0.014);
        dTree = smin(dTree, sdCapsuleTapered(p, vec2(-0.112, -0.226), vec2(-0.102, -0.175), 0.018, 0.024), 0.012);

        // S-curved gnarled main trunk
        vec2 t1 = vec2(-0.102, -0.18);
        vec2 t2 = vec2(-0.135, -0.06) + sw1 * 0.4;
        vec2 t3 = vec2(-0.065,  0.07) + sw1;
        vec2 t4 = vec2(-0.015,  0.18) + sw2;
        vec2 t5 = vec2( 0.022,  0.24) + sw3;

        dTree = smin(dTree, sdCapsuleTapered(p, t1, t2, 0.029, 0.023), 0.012);
        dTree = smin(dTree, sdCapsuleTapered(p, t2, t3, 0.023, 0.018), 0.012);
        dTree = smin(dTree, sdCapsuleTapered(p, t3, t4, 0.018, 0.012), 0.010);
        dTree = smin(dTree, sdCapsuleTapered(p, t4, t5, 0.012, 0.007), 0.008);

        // Sweeping left lower limb
        vec2 l1 = vec2(-0.24, 0.02) + sw2;
        vec2 l2 = vec2(-0.31, 0.055) + sw2;
        dTree = smin(dTree, sdCapsuleTapered(p, t2 + vec2(0.01, 0.04), l1, 0.015, 0.009), 0.010);
        dTree = smin(dTree, sdCapsuleTapered(p, l1, l2, 0.009, 0.005), 0.006);

        // Sweeping right cantilevered limb over the lake
        vec2 r1 = vec2(0.06, 0.05) + sw2;
        vec2 r2 = vec2(0.18, 0.085) + sw3;
        dTree = smin(dTree, sdCapsuleTapered(p, t3 - vec2(0.01, 0.02), r1, 0.015, 0.010), 0.010);
        dTree = smin(dTree, sdCapsuleTapered(p, r1, r2, 0.010, 0.005), 0.006);

        // Upper left & right crown branches
        vec2 ul1 = vec2(-0.16, 0.175) + sw3;
        dTree = smin(dTree, sdCapsuleTapered(p, t4 - vec2(0.01, 0.03), ul1, 0.011, 0.005), 0.008);
        vec2 ur1 = vec2(0.11, 0.21) + sw3;
        dTree = smin(dTree, sdCapsuleTapered(p, t4, ur1, 0.010, 0.005), 0.008);

        float barkNoise = fbm(vec2(p.x * 42.0, p.y * 14.0));
        dTree += (barkNoise - 0.5) * 0.0038;

        if (dTree < 0.004) {
            float trunkMask = smoothstep(0.0028, -0.0022, dTree);
            float sunBias = clamp((keyLightPos.x - p.x) * 3.0, -1.0, 1.0);
            float barkRim = smoothstep(-0.025, 0.025, (p.x - (-0.09)) * sunBias);
            vec3 barkDark = mix(vec3(0.05, 0.04, 0.05), vec3(0.14, 0.09, 0.07), dayFactor);
            vec3 barkLit  = mix(vec3(0.13, 0.12, 0.15), vec3(0.38, 0.26, 0.18), dayFactor);
            barkLit = mix(barkLit, vec3(0.50, 0.29, 0.16), twilightFactor * 0.65);

            vec3 barkCol = mix(barkDark, barkLit, (0.30 + 0.70 * barkNoise) * (0.35 + 0.65 * barkRim));
            // Subtle mossy patina near the lower trunk base
            float baseMoss = smoothstep(-0.11, -0.21, p.y) * smoothstep(0.45, 0.75, barkNoise);
            barkCol = mix(barkCol, u_color_foliage.rgb * (0.25 + 0.45 * dayFactor), baseMoss * 0.45);

            float dLantBark = length(p - lanternPos);
            barkCol += lanternCol * (0.006 / (dLantBark * dLantBark + 0.015)) * lanternGlowStrength;
            float dWispBark = length(p - wispPos);
            barkCol += wispColor * (0.007 / (dWispBark * dWispBark + 0.02)) * wispVis;

            sceneColor = mix(sceneColor, barkCol, trunkMask);
        }

        // --- Hanging Paper Lantern (Tōrō) ---
        float dCord = sdCapsuleTapered(p, lanternAnchor, lanternPos + vec2(0.0, 0.018), 0.0015, 0.0015);
        if (dCord < 0.002) {
            sceneColor = mix(sceneColor, vec3(0.08, 0.06, 0.05), smoothstep(0.002, 0.0, dCord));
        }
        vec2 lp = p - lanternPos;
        float lanternBody = length(vec2(lp.x * 1.35, lp.y * 0.95));
        if (lanternBody < 0.022) {
            float lMask = smoothstep(0.018, 0.014, lanternBody);
            float ribs = 0.92 + 0.08 * sin(lp.y * 280.0);
            vec3 paperDay = vec3(0.95, 0.88, 0.72) * ribs;
            vec3 paperLit = vec3(1.0, 0.86, 0.45) * (1.25 + 0.25 * sin(mod(t * 5.0, TAU))) * ribs;
            vec3 lCol = mix(paperDay, paperLit, clamp(lanternGlowStrength, 0.0, 1.0));
            float caps = smoothstep(0.012, 0.015, abs(lp.y));
            lCol = mix(lCol, vec3(0.10, 0.07, 0.05), caps);
            sceneColor = mix(sceneColor, lCol, lMask);
        }
        float lDist = length(lp);
        sceneColor += lanternCol * exp(-lDist * 16.0) * 0.62 * lanternGlowStrength;

        // --- Layered Painterly Niwaki Foliage Canopies (6 lush multi-lobe pads) ---
        vec2 padCenter[6];
        vec2 padScale[6];
        padCenter[0] = vec2(-0.30, 0.075) + sw2 + vec2(leafFlutter, 0.0);
        padScale[0]  = vec2(0.115, 0.056);

        padCenter[1] = vec2(-0.17, 0.195) + sw3 + vec2(leafFlutter * 1.2, 0.0);
        padScale[1]  = vec2(0.125, 0.062);

        padCenter[2] = vec2( 0.19, 0.105) + sw3 + vec2(leafFlutter, 0.0);
        padScale[2]  = vec2(0.135, 0.062);

        padCenter[3] = vec2(-0.06, 0.135) + sw2 + vec2(leafFlutter * 0.8, 0.0);
        padScale[3]  = vec2(0.105, 0.052);

        padCenter[4] = vec2( 0.10, 0.225) + sw3 + vec2(leafFlutter * 1.1, 0.0);
        padScale[4]  = vec2(0.118, 0.058);

        padCenter[5] = vec2( 0.00, 0.275) + sw3 + vec2(leafFlutter * 1.3, 0.0);
        padScale[5]  = vec2(0.145, 0.072);

        vec3 sunDir3 = normalize(vec3(keyLightPos - vec2(0.0, 0.16), 0.55));

        for (int i = 0; i < 6; ++i) {
            vec2 d = (p - padCenter[i]) / padScale[i];
            if (dot(d, d) < 2.2) {
                float lobe1 = length(d - vec2(-0.42, -0.06)) * 1.18;
                float lobe2 = length(d - vec2( 0.00,  0.14)) * 1.02;
                float lobe3 = length(d - vec2( 0.44, -0.08)) * 1.15;
                float padDist = smin(lobe1, smin(lobe2, lobe3, 0.25), 0.25);

                float leafFbm = fbm(p * 34.0 + vec2(float(i) * 4.7, float(i) * 2.3));
                float fineLeaf = vnoise(p * 82.0 + vec2(float(i) * 9.1, 1.4));
                float ruffledDist = padDist - (leafFbm - 0.45) * 0.36 - (fineLeaf - 0.5) * 0.12;

                if (ruffledDist < 0.98) {
                    float cMask = smoothstep(0.98, 0.86, ruffledDist);

                    // Rich 3D dome normal + distinct underside shadow for painterly pad separation
                    vec3 n = normalize(vec3(
                        d.x * 0.65 + (leafFbm - 0.5) * 0.45,
                        d.y * 0.95 + 0.30 + (fineLeaf - 0.5) * 0.35,
                        0.68
                    ));
                    float ndl = clamp(dot(n, sunDir3) * 0.5 + 0.5, 0.0, 1.0);
                    float underShadow = smoothstep(-0.65, 0.15, d.y);

                    vec3 folBase = u_color_foliage.rgb;
                    vec3 folShadow = mix(vec3(0.015, 0.04, 0.08), folBase * 0.22 + ambientShadowCol * 0.22, dayFactor);
                    vec3 folMid    = mix(folBase * 0.24 + vec3(0.03, 0.07, 0.10), folBase * 0.95, dayFactor);
                    vec3 folCrown  = mix(folBase * 0.46 + vec3(0.14, 0.22, 0.30), mix(folBase * 1.42, keyLightCol, 0.42), dayFactor);
                    folCrown = mix(folCrown, mix(folBase * 0.9, vec3(1.0, 0.58, 0.28), 0.55), twilightFactor * 0.72);

                    float litTone = smoothstep(0.24, 0.60, ndl * (0.45 + 0.55 * underShadow) + (leafFbm - 0.5) * 0.24);
                    float crownTone = smoothstep(0.58, 0.86, ndl * underShadow + (fineLeaf - 0.5) * 0.22);

                    vec3 folCol = mix(folShadow, folMid, litTone);
                    folCol = mix(folCol, folCrown, crownTone * 0.88);

                    // Snow cap on foliage tops in Alpine Winter / Snow mode
                    float snowTop = isSnow * smoothstep(0.08, 0.52, d.y + (leafFbm - 0.5) * 0.25);
                    folCol = mix(folCol, vec3(0.88, 0.94, 1.0) * (0.3 + 0.7 * dayFactor), snowTop * 0.75);

                    // Warm point-light bounce from hanging paper lantern & will-o'-the-wisp
                    float dLant = length(p - lanternPos);
                    folCol += lanternCol * (0.007 / (dLant * dLant + 0.016)) * lanternGlowStrength;
                    float dWisp = length(p - wispPos);
                    folCol += wispColor * (0.009 / (dWisp * dWisp + 0.024)) * wispVis;

                    sceneColor = mix(sceneColor, folCol, cMask * 0.98);
                }
            }
        }
    }

    // ------------------------------------------------------------------------
    // 7. Layered Valley Mist & Fog Ribbons
    // ------------------------------------------------------------------------
    float effectiveFog = clamp(u_fog_density + isMist * 0.55 + isRain * 0.22, 0.0, 1.4);
    if (effectiveFog > 0.05) {
        float fogBand = smoothstep(0.06, -0.14, p.y) * smoothstep(-0.42, -0.18, p.y);
        vec2 fogUV1 = vec2(p.x * 2.4 - mod(t * windSpeed * 0.06, 64.0), p.y * 5.0);
        vec2 fogUV2 = vec2(p.x * 4.2 - mod(t * windSpeed * 0.10, 64.0) + 4.3, p.y * 7.5);
        float fogNoise = smoothstep(0.28, 0.76, fbm(fogUV1) * 0.65 + fbm(fogUV2) * 0.35);
        vec3 fogCol = mix(hazeCol, vec3(0.92, 0.96, 1.0), dayFactor * 0.35);
        fogCol = mix(fogCol, vec3(1.0, 0.75, 0.52), twilightFactor * 0.45);
        sceneColor = mix(sceneColor, fogCol, clamp(fogBand * fogNoise * effectiveFog * 0.48, 0.0, 0.75));
    }

    // ------------------------------------------------------------------------
    // 8. Interactive Will-o'-the-Wisp Companion & Smooth Orbiting Fairy Motes
    // ------------------------------------------------------------------------
    float wispDist = length(p - wispPos);
    float wispPulse = 0.88 + 0.16 * sin(mod(t * 5.5, TAU));
    float wispCore = smoothstep(0.011, 0.0015, wispDist);
    float wispInner = exp(-wispDist * 20.0) * wispPulse;
    float wispAura = exp(-wispDist * 6.5) * 0.22 * wispPulse;

    sceneColor += mix(wispColor, vec3(1.0, 0.99, 0.94), 0.72) * wispCore * (1.8 * wispVis + 0.5);
    sceneColor += wispColor * (wispInner * 1.05 + wispAura) * wispVis;

    if (wispDist < 0.15) {
        for (int m = 0; m < 6; ++m) {
            float fm = float(m);
            float ang = mod(t * (1.4 + fm * 0.28) + fm * 1.0472, TAU);
            float rad = 0.022 + 0.016 * sin(mod(t * 2.1 + fm * 1.7, TAU)) + fm * 0.007;
            vec2 motePos = wispPos + vec2(cos(ang) * rad * 1.15, sin(ang) * rad * 0.85);
            float md = length(p - motePos);
            float moteGlow = smoothstep(0.006, 0.0008, md) + exp(-md * 95.0) * 0.42;
            sceneColor += mix(wispColor, vec3(1.0, 0.98, 0.85), 0.5) * moteGlow * 0.80 * wispVis;
        }
    }

    // ------------------------------------------------------------------------
    // 9. Organic Jittered Fireflies (Ambient Night + Keystroke Spore Burst)
    // ------------------------------------------------------------------------
    float fireflyIntensity = clamp(nightFactor * 0.58 + twilightFactor * 0.35 + u_keystroke_energy * 1.35 + u_mids * 0.22, 0.0, 1.8);
    if (fireflyIntensity > 0.08 && p.y < 0.24) {
        float meadowEnv = smoothstep(0.24, -0.05, p.y) * smoothstep(-0.48, -0.25, p.y);
        for (int fl = 0; fl < 2; ++fl) {
            float scale = (fl == 0) ? 11.0 : 18.0;
            vec2 drift = vec2(mod(t * windSpeed * (0.28 + float(fl) * 0.14), 64.0), mod(t * (0.35 + u_keystroke_energy * 0.6), 64.0));
            vec2 fp = p * scale - drift + vec2(float(fl) * 13.7, float(fl) * 5.3);
            vec2 fCell = floor(fp);
            vec2 fF = fract(fp);
            float chance = hash12(fCell + 7.1);
            float threshold = mix(0.84, 0.68, clamp(u_keystroke_energy, 0.0, 1.0));
            if (chance > threshold) {
                vec2 rnd = hash22(fCell);
                vec2 center = 0.22 + 0.56 * rnd + 0.12 * vec2(
                    sin(mod(t * 2.2 + rnd.x * TAU, TAU)),
                    cos(mod(t * 1.9 + rnd.y * TAU, TAU))
                );
                float d = length(fF - center);
                float orb = smoothstep(0.13, 0.015, d) + exp(-d * 10.5) * 0.32;
                float blink = 0.45 + 0.55 * sin(mod(t * (3.5 + rnd.x * 3.0) + rnd.y * TAU, TAU));
                vec3 ffCol = mix(u_color_wisp.rgb, vec3(0.75, 1.0, 0.45), rnd.x * 0.55);
                float layerAlpha = (fl == 0) ? 1.0 : 0.65;
                sceneColor += ffCol * orb * blink * fireflyIntensity * meadowEnv * layerAlpha;
            }
        }
    }

    // ------------------------------------------------------------------------
    // 10. Meteorological Weather Overlays (Slanted Rain Streaks & Parallax Snow)
    // ------------------------------------------------------------------------
    if (isRain > 0.02) {
        for (int rl = 0; rl < 2; ++rl) {
            float rScaleX = (rl == 0) ? 58.0 : 98.0;
            float rScaleY = (rl == 0) ? 8.5  : 14.0;
            float rSpeed  = (rl == 0) ? 22.0 : 14.0;
            vec2 rp = vec2(p.x + p.y * 0.18, p.y);
            vec2 cellUV = vec2(rp.x * rScaleX, rp.y * rScaleY + mod(t * rSpeed, 128.0));
            vec2 rCell = floor(cellUV);
            vec2 rF = fract(cellUV);
            float rChance = hash12(rCell + float(rl) * 19.0);
            if (rChance > 0.76) {
                float xOff = 0.2 + 0.6 * hash12(rCell + 3.1);
                float dx = abs(rF.x - xOff);
                float streak = smoothstep(0.075, 0.008, dx) * smoothstep(0.0, 0.25, rF.y) * smoothstep(1.0, 0.55, rF.y);
                float bright = (rl == 0) ? 0.38 : 0.22;
                sceneColor += mix(vec3(0.55, 0.68, 0.85), vec3(0.82, 0.90, 0.98), dayFactor) * streak * bright * isRain;
            }
        }
    }

    if (isSnow > 0.02) {
        for (int sl = 0; sl < 3; ++sl) {
            float fsl = float(sl);
            float sScale = 14.0 + fsl * 10.0;
            float fallSpeed = 1.6 - fsl * 0.35;
            float swayX = sin(mod(t * (1.2 + fsl * 0.4) + p.y * 4.5 + fsl * 2.1, TAU)) * 0.35;
            vec2 sp = vec2(p.x * sScale + swayX - mod(t * windSpeed * 0.3, 64.0), p.y * sScale + mod(t * fallSpeed, 64.0));
            vec2 sCell = floor(sp);
            vec2 sF = fract(sp);
            float sChance = hash12(sCell + fsl * 23.1);
            if (sChance > 0.78) {
                vec2 sPos = 0.22 + 0.56 * hash22(sCell + 5.7);
                float sd = length(sF - sPos);
                float sRad = mix(0.16, 0.09, fsl * 0.4);
                float flake = smoothstep(sRad, sRad * 0.2, sd);
                sceneColor += vec3(0.92, 0.96, 1.0) * flake * (0.72 - fsl * 0.16) * isSnow;
            }
        }
    }

    // ------------------------------------------------------------------------
    // 11. Screensaver Lifecycle Phenomena
    // ------------------------------------------------------------------------
    if (u_vortex_speed < 0.0) {
        float gustFactor = clamp(-u_vortex_speed * 0.75, 0.0, 1.2);
        vec2 lp = p * 12.0 - vec2(mod(t * 7.5, 64.0), sin(mod(t * 3.0, TAU)) * 2.0);
        vec2 lCell = floor(lp);
        vec2 lF = fract(lp);
        float lRand = hash12(lCell + 11.3);
        if (lRand > 0.78) {
            vec2 c = 0.25 + 0.5 * hash22(lCell);
            vec2 d = lF - c;
            float ang = mod(t * 4.0 + lRand * TAU, TAU);
            float ca = cos(ang), sa = sin(ang);
            d = mat2(ca, -sa, sa, ca) * d;
            float leafShape = length(vec2(d.x * 1.1, d.y * 2.6));
            float leafMask = smoothstep(0.18, 0.08, leafShape);
            vec3 leafCol = mix(vec3(0.92, 0.34, 0.12), vec3(0.96, 0.68, 0.18), lRand);
            sceneColor = mix(sceneColor, leafCol, leafMask * gustFactor * 0.85);
        }
    }

    if (u_shockwave_intensity > 0.01 || u_frost_amount > 0.01) {
        float frostStrength = clamp(max(u_shockwave_intensity, u_frost_amount), 0.0, 1.0);
        float borderDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
        float crystal = ridgedFbm(uv * vec2(aspect * 12.0, 12.0) + vec2(1.4, 2.7));
        float fineIce = ridgedFbm(uv * vec2(aspect * 28.0, 28.0) - vec2(3.1, 1.2));
        float frostEdge = smoothstep(0.28 * frostStrength, 0.0, borderDist - (crystal - 0.5) * 0.14);
        vec3 frostCol = mix(vec3(0.76, 0.89, 1.0), vec3(0.98, 0.99, 1.0), smoothstep(0.45, 0.85, fineIce));
        float lum = dot(sceneColor, vec3(0.299, 0.587, 0.114));
        vec3 chilled = mix(vec3(lum) * vec3(0.82, 0.92, 1.0), frostCol, 0.55 + 0.35 * fineIce);
        sceneColor = mix(sceneColor, chilled, frostEdge * frostStrength * 0.88);
    }

    if (u_vortex_speed > 2.0) {
        float dawnSpeed = clamp((u_vortex_speed - 2.0) * 0.6, 0.0, 0.92);
        vec3 dawnBurst = mix(vec3(1.0, 0.86, 0.48), vec3(1.0, 0.98, 0.92), 0.5 + 0.5 * sin(mod(t * 4.0, TAU)));
        sceneColor = mix(sceneColor, dawnBurst * 1.45, dawnSpeed);
    }

    // Gentle Filmic Tone Mapping & Subtle Painterly Vignette
    sceneColor = sceneColor / (vec3(1.0) + sceneColor * 0.18);
    float vig = 1.0 - dot(uv - 0.5, uv - 0.5) * 0.24;
    sceneColor *= vig;

    fragColor = vec4(clamp(sceneColor, 0.0, 1.0), 1.0) * qt_Opacity;
}
