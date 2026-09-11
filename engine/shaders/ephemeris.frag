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

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(cos(0.42), sin(0.42), -sin(0.42), cos(0.42));
    for (int i = 0; i < 4; ++i) {
        v += a * noise2D(p);
        p = rot * p * 2.05 + vec2(1.6, 0.9);
        a *= 0.5;
    }
    return v;
}

void main() {
    vec2 uv = qt_TexCoord0;
    float aspect = u_resolution.x / max(u_resolution.y, 1.0);
    // Standard screen coordinates (+Y is UP towards sky, -Y is DOWN towards meadow)
    vec2 p = vec2(uv.x - 0.5, 0.5 - uv.y) * vec2(aspect, 1.0);

    float t = u_time * 0.8;
    float windSpeed = (0.5 + length(u_wind_vector) * 1.5 + u_bass * 1.8) * max(0.2, u_vortex_speed);
    vec2 windDir = normalize(u_wind_vector + vec2(1.0, 0.15));

    // ------------------------------------------------------------------------
    // 1. Astronomical Ephemeris & Solar/Lunar Dynamics
    // ------------------------------------------------------------------------
    float solarHour = mod(u_solar_time, 24.0);
    // Solar trajectory angle: 6h = Dawn, 12h = Noon, 18h = Sunset, 24h/0h = Midnight
    float solarRad = (solarHour - 6.0) / 12.0 * 3.14159265;
    float sunElev = sin(solarRad);
    float sunAzi = -cos(solarRad) * 0.42 * aspect;

    // Sun screen coordinate
    vec2 sunPos = vec2(sunAzi, sunElev * 0.35 + 0.05);

    // Moon is positioned opposite the sun in the celestial dome
    vec2 moonPos = vec2(-sunAzi, -sunElev * 0.35 + 0.05);

    // Daylight balance factor (0.0 = deep night, 0.5 = dawn/dusk, 1.0 = midday)
    float dayFactor = smoothstep(-0.25, 0.35, sunElev);
    float goldenHour = smoothstep(0.4, 0.0, abs(sunElev)) * (1.0 - smoothstep(0.35, 0.55, sunElev));

    // ------------------------------------------------------------------------
    // 2. Atmospheric Sky Dome (Preetham / Ghibli Twilight Model)
    // ------------------------------------------------------------------------
    // Day Sky: Crisp Ghibli azure blue fading to warm horizon haze
    vec3 skyDay = mix(vec3(0.55, 0.78, 0.95), vec3(0.22, 0.48, 0.85), clamp(p.y * 1.8 + 0.5, 0.0, 1.0));
    // Golden Hour Sky: Amber-peach horizon into coral and lavender zenith
    vec3 skySunset = mix(vec3(0.98, 0.55, 0.28), vec3(0.45, 0.22, 0.55), clamp(p.y * 1.5 + 0.5, 0.0, 1.0));
    // Night Sky: Deep indigo/navy into starry celestial obsidian
    vec3 skyNight = mix(u_color_sky.rgb, vec3(0.02, 0.03, 0.08), clamp(p.y * 1.5 + 0.4, 0.0, 1.0));

    vec3 skyColor = mix(skyNight, skyDay, dayFactor);
    skyColor = mix(skyColor, skySunset, goldenHour * 0.85);

    // Celestial Starfield & Milky Way Ribbon (visible during night & twilight)
    if (dayFactor < 0.75) {
        float nightAlpha = (1.0 - dayFactor);
        vec2 starCoord1 = p * 80.0;
        vec2 starGrid1 = floor(starCoord1);
        float starRand1 = hash12(starGrid1);
        float starTwinkle = 0.65 + 0.35 * sin(t * 3.0 + starRand1 * 62.8);
        float star1 = pow(starRand1, 42.0) * starTwinkle;

        vec2 starCoord2 = p * 160.0;
        vec2 starGrid2 = floor(starCoord2);
        float starRand2 = hash12(starGrid2);
        float star2 = pow(starRand2, 55.0) * 0.85;

        // Milky Way Cosmic Ribbon Dust
        float milkyDust = fbm(p * 2.5 + vec2(0.5, 0.8)) * fbm(p * 5.0 - vec2(0.8, 0.2));
        vec3 milkyColor = mix(vec3(0.25, 0.35, 0.65), vec3(0.65, 0.45, 0.75), p.y + 0.5) * milkyDust * 0.4;

        skyColor += (vec3(star1 + star2) + milkyColor) * nightAlpha;
    }

    // ------------------------------------------------------------------------
    // 3. Sun & Moon Celestial Discs
    // ------------------------------------------------------------------------
    // Sun rendering
    if (sunElev > -0.15) {
        float sunDist = length(p - sunPos);
        // Sun Disc
        float sunDisc = smoothstep(0.045, 0.038, sunDist);
        // Solar Corona & Rayleigh Atmospheric Glow
        float sunGlow = exp(-sunDist * 6.5) * (1.2 + u_bass * 0.4);
        vec3 sunColor = mix(u_color_sun_moon.rgb, vec3(1.0, 0.98, 0.92), 0.75);
        if (goldenHour > 0.3) {
            sunColor = mix(sunColor, vec3(1.0, 0.45, 0.15), goldenHour);
        }
        skyColor += sunColor * sunDisc * 2.5 + sunColor * sunGlow * (0.6 + goldenHour * 0.8);
    }

    // Moon rendering (visible when sun is below or near horizon)
    if (sunElev < 0.3) {
        float moonAlpha = smoothstep(0.3, -0.1, sunElev);
        float moonDist = length(p - moonPos);
        float moonRadius = 0.042;
        if (moonDist < moonRadius * 1.5) {
            float moonDisc = smoothstep(moonRadius, moonRadius - 0.003, moonDist);
            // Lunar Phase Shadow: phase from 0.0 (New) to 0.5 (Full) to 1.0 (New)
            vec2 moonLocal = (p - moonPos) / moonRadius;
            float phaseOffset = (u_lunar_phase - 0.5) * 2.0; // -1 to 1
            float shadowDist = length(vec2(moonLocal.x - phaseOffset * 0.85, moonLocal.y));
            float phaseShadow = smoothstep(0.9, 1.1, shadowDist);

            // Lunar surface crater noise
            float crater = fbm(moonLocal * 4.0) * 0.25;
            vec3 moonSurface = vec3(0.92, 0.94, 0.98) - vec3(crater);
            // Soft earthshine on dark side
            vec3 earthshine = vec3(0.08, 0.12, 0.20);
            vec3 moonCol = mix(earthshine, moonSurface, phaseShadow);

            float moonHalo = exp(-moonDist * 12.0) * 0.35;
            skyColor += (moonCol * moonDisc + vec3(0.7, 0.85, 1.0) * moonHalo) * moonAlpha;
        }
    }

    // ------------------------------------------------------------------------
    // 4. Painterly Landscape Layers (Mountains, Terraces & Meadow)
    // ------------------------------------------------------------------------
    vec3 sceneColor = skyColor;

    // Distant Alpine Mountain Peaks (Layer 1)
    float mtn1Height = 0.10 + 0.16 * fbm(vec2(p.x * 0.8 + 1.2, 2.5));
    if (p.y < mtn1Height) {
        float mtn1Mask = smoothstep(mtn1Height, mtn1Height - 0.015, p.y);
        vec3 mtn1Color = mix(skyColor * 0.7, vec3(0.25, 0.35, 0.50), dayFactor);
        // Snow capped ridges
        float snowCap = smoothstep(0.18, 0.24, mtn1Height) * smoothstep(0.14, 0.20, p.y);
        mtn1Color = mix(mtn1Color, vec3(0.90, 0.95, 1.0), snowCap * 0.7);
        sceneColor = mix(sceneColor, mtn1Color, mtn1Mask * 0.85);
    }

    // Mid-Distance Forested Ridge (Layer 2)
    float mtn2Height = -0.04 + 0.12 * fbm(vec2(p.x * 1.6 + 5.0, 4.2));
    if (p.y < mtn2Height) {
        float mtn2Mask = smoothstep(mtn2Height, mtn2Height - 0.012, p.y);
        vec3 mtn2Color = mix(vec3(0.08, 0.15, 0.22), u_color_foliage.rgb * 0.55, dayFactor);
        sceneColor = mix(sceneColor, mtn2Color, mtn2Mask * 0.92);
    }

    // Foreground Rolling Meadow & Mossy Terrace (Layer 3)
    float hillHeight = -0.18 + 0.07 * sin(p.x * 2.2 + 0.4) + 0.03 * fbm(vec2(p.x * 3.5, 6.0));
    if (p.y < hillHeight) {
        float hillMask = smoothstep(hillHeight, hillHeight - 0.01, p.y);
        // Wind grass ripples
        float grassWave = sin(p.x * 18.0 - t * windSpeed * 3.5 + p.y * 12.0);
        float grassShimmer = (grassWave * 0.5 + 0.5) * (0.15 + u_bass * 0.25);

        vec3 grassBase = mix(vec3(0.05, 0.12, 0.16), u_color_foliage.rgb, dayFactor);
        vec3 grassColor = grassBase * (0.85 + grassShimmer);

        // Alpine Valley Stream / Lake at the bottom
        if (p.y < -0.32) {
            float streamMask = smoothstep(-0.30, -0.34, p.y);
            // Water ripples flowing along wind
            float waterWave = sin(p.x * 25.0 - t * 4.0) * sin(p.y * 40.0 - t * 3.0);
            vec3 waterColor = mix(vec3(0.04, 0.08, 0.18), vec3(0.12, 0.35, 0.45), dayFactor);
            // Sky & Sun/Moon water reflection
            waterColor += skyColor * 0.35 + vec3(waterWave * 0.06);
            grassColor = mix(grassColor, waterColor, streamMask);
        }

        sceneColor = mix(sceneColor, grassColor, hillMask);
    }

    // ------------------------------------------------------------------------
    // 5. Central Ancient Mountain Bonsai / Pine Tree
    // ------------------------------------------------------------------------
    // Gnarled trunk silhouette rising from meadow
    vec2 trunkBase = vec2(0.06, -0.22);
    vec2 toTrunk = p - trunkBase;

    // Curved organic trunk path
    float trunkCurve = sin(toTrunk.y * 6.5) * 0.04 + (toTrunk.y * toTrunk.y) * 0.15;
    float trunkDistX = abs(toTrunk.x - trunkCurve);
    float trunkTaper = mix(0.042, 0.016, clamp((toTrunk.y + 0.05) / 0.35, 0.0, 1.0));

    if (toTrunk.y > -0.05 && toTrunk.y < 0.32 && trunkDistX < trunkTaper) {
        float trunkBark = fbm(vec2(p.x * 35.0, p.y * 8.0));
        vec3 barkColor = mix(vec3(0.12, 0.08, 0.06), vec3(0.28, 0.20, 0.14), trunkBark) * (0.35 + 0.65 * dayFactor);
        sceneColor = mix(sceneColor, barkColor, smoothstep(trunkTaper, trunkTaper - 0.004, trunkDistX));
    }

    // Tiered Pine Foliage Clouds (*Niwaki* style cloud clusters)
    // 4 cloud cluster positions around the bonsai branches
    vec2 clouds[4];
    clouds[0] = vec2(-0.12, 0.12);
    clouds[1] = vec2(0.18, 0.18);
    clouds[2] = vec2(-0.04, 0.26);
    clouds[3] = vec2(0.12, 0.32);

    float foliageSway = sin(t * 2.0 + u_time * windSpeed) * (0.008 + u_bass * 0.02);

    for (int i = 0; i < 4; ++i) {
        vec2 cPos = clouds[i] + vec2(foliageSway * float(i + 1), 0.0);
        vec2 cDiff = p - cPos;
        // Cloud ellipse
        float cDist = length(vec2(cDiff.x * 1.5, cDiff.y * 2.2));
        float cRadius = 0.085 + 0.025 * float(i % 2);

        if (cDist < cRadius) {
            float cMask = smoothstep(cRadius, cRadius - 0.02, cDist);
            float leafDetail = fbm(cDiff * 25.0);
            vec3 folCol = mix(vec3(0.06, 0.14, 0.12), u_color_foliage.rgb * 1.25, dayFactor);
            folCol *= (0.75 + 0.5 * leafDetail);

            // Sun rim lighting on foliage edges
            if (sunElev > 0.0) {
                float rimLight = clamp(dot(normalize(cDiff), normalize(sunPos - cPos)), 0.0, 1.0);
                folCol += vec3(1.0, 0.95, 0.7) * pow(rimLight, 3.0) * 0.6 * dayFactor;
            }

            sceneColor = mix(sceneColor, folCol, cMask * 0.95);
        }
    }

    // ------------------------------------------------------------------------
    // 6. Interactive Will-o'-the-Wisp Companion Light
    // ------------------------------------------------------------------------
    // Wisp follows mouse pointer with organic hovering
    vec2 wispTarget = vec2((u_pointer.x - 0.5) * aspect, 0.5 - u_pointer.y);
    vec2 wispHover = vec2(sin(t * 3.5) * 0.012, cos(t * 4.2) * 0.015);
    vec2 wispPos = wispTarget + wispHover;

    float wispDist = length(p - wispPos);
    // Brilliant inner fairy core
    float wispCore = smoothstep(0.014, 0.002, wispDist);
    // Ethereal pulsing aura
    float wispPulse = 0.85 + 0.25 * sin(t * 8.0);
    float wispGlow = exp(-wispDist * 14.0) * wispPulse;
    // Outer point-light illumination of meadow & branches
    float wispLight = (0.025 / (wispDist * wispDist + 0.035));

    vec3 wispColor = u_color_wisp.rgb;
    sceneColor += wispColor * wispCore * 3.5;
    sceneColor += wispColor * wispGlow * 1.5;
    sceneColor += wispColor * wispLight * 0.12;

    // Fluttering fairy dust trail
    float trailAngle = atan(p.y - wispPos.y, p.x - wispPos.x);
    float trailSpark = pow(hash12(floor(p * 90.0 - t * 2.0)), 18.0) * smoothstep(0.12, 0.02, wispDist);
    sceneColor += vec3(1.0, 0.95, 0.8) * trailSpark * 1.8;

    // ------------------------------------------------------------------------
    // 7. Keystroke Firefly Spores & Pollen Embers
    // ------------------------------------------------------------------------
    if (u_keystroke_energy > 0.02) {
        // Swarms of glowing golden fireflies rising into the breeze
        vec2 sporeGrid = floor(p * 45.0 - vec2(t * windSpeed * 4.0, t * 8.0));
        float sporeRand = hash12(sporeGrid);
        if (sporeRand > 0.82) {
            vec2 sporeLocal = fract(p * 45.0 - vec2(t * windSpeed * 4.0, t * 8.0)) - vec2(0.5);
            float sporeDist = length(sporeLocal);
            float sporeGlow = smoothstep(0.28, 0.04, sporeDist) * u_keystroke_energy;
            float sporeBlink = 0.6 + 0.4 * sin(t * 12.0 + sporeRand * 30.0);
            vec3 sporeColor = mix(vec3(1.0, 0.85, 0.3), vec3(0.4, 1.0, 0.5), sporeRand);
            sceneColor += sporeColor * sporeGlow * sporeBlink * 2.2;
        }
    }

    // ------------------------------------------------------------------------
    // 8. Meteorological Weather Overlays (Rain, Snow, Mist)
    // ------------------------------------------------------------------------
    // Mode 1: Gentle Spring Rain
    if (u_weather_mode > 0.5 && u_weather_mode < 1.5) {
        vec2 rainCell = vec2(p.x * 120.0 - t * 4.0, uv.y * 32.0 - t * 45.0);
        float rainRand = hash12(floor(rainCell));
        float rainStreak = pow(rainRand, 25.0) * pow(fract(rainCell.y), 3.0);
        sceneColor += vec3(0.75, 0.88, 1.0) * rainStreak * 0.85;
    }
    // Mode 2: Alpine Snowfall
    else if (u_weather_mode >= 1.5 && u_weather_mode < 2.5) {
        vec2 snowCell = vec2(p.x * 60.0 + sin(t + uv.y * 5.0) * 2.0, uv.y * 22.0 - t * 6.0);
        float snowRand = hash12(floor(snowCell));
        if (snowRand > 0.88) {
            float flakeDist = length(fract(snowCell) - vec2(0.5));
            float flake = smoothstep(0.35, 0.05, flakeDist);
            sceneColor += vec3(0.95, 0.98, 1.0) * flake * 0.9;
        }
    }

    // Volumetric Valley Fog & Mist
    if (u_fog_density > 0.05) {
        float fogBand = smoothstep(0.05, -0.25, p.y) * smoothstep(-0.45, -0.25, p.y);
        float fogFlow = fbm(p * 3.5 + vec2(t * windSpeed * 0.3, 0.0));
        vec3 fogCol = mix(skyColor * 0.65, vec3(0.85, 0.92, 0.98), dayFactor * 0.5);
        sceneColor = mix(sceneColor, fogCol, fogBand * fogFlow * u_fog_density * 0.75);
    }

    // ------------------------------------------------------------------------
    // 9. Screensaver Lifecycle Phenomena
    // ------------------------------------------------------------------------
    // Backspace Autumn Gust: Swirling leaf vortices
    if (u_vortex_speed < 0.0) {
        float gustFactor = clamp(-u_vortex_speed * 0.7, 0.0, 1.5);
        vec2 leafCell = floor(p * 25.0 - vec2(t * 15.0, sin(t * 8.0) * 5.0));
        float leafRand = hash12(leafCell);
        if (leafRand > 0.85) {
            vec3 leafCol = mix(vec3(0.95, 0.35, 0.1), vec3(0.85, 0.65, 0.1), leafRand);
            sceneColor = mix(sceneColor, leafCol, gustFactor * 0.7);
        }
    }

    // Wrong Password: Sudden Mountain Frost Crystals
    if (u_shockwave_intensity > 0.01 || u_frost_amount > 0.01) {
        float frostStrength = max(u_shockwave_intensity, u_frost_amount);
        float borderDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
        float frostRime = fbm(uv * 18.0 + vec2(t * 0.2)) * 0.4;
        float frostEdge = smoothstep(0.35 * frostStrength, 0.05, borderDist + frostRime);
        vec3 frostColor = vec3(0.85, 0.94, 1.0);
        // Frost cools and desaturates scene
        float lum = dot(sceneColor, vec3(0.299, 0.587, 0.114));
        sceneColor = mix(sceneColor, mix(vec3(lum), frostColor, 0.65), frostEdge * frostStrength);
    }

    // Correct Password: Golden Dawn Awakening (God Rays to Desktop)
    if (u_vortex_speed > 2.0) {
        float dawnSpeed = u_vortex_speed - 2.0;
        vec3 dawnBurst = mix(vec3(1.0, 0.85, 0.4), vec3(1.0, 0.98, 0.9), sin(t * 6.0) * 0.5 + 0.5);
        sceneColor = mix(sceneColor, dawnBurst * 2.0, clamp(dawnSpeed * 0.6, 0.0, 0.92));
    }

    fragColor = vec4(sceneColor, 1.0) * qt_Opacity;
}
