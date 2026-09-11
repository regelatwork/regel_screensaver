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
    vec4 u_color_neon1;          // 144..159 (Cyan / Hot Pink neon)
    vec4 u_color_neon2;          // 160..175 (Amber / Violet neon)
    vec4 u_color_grid;           // 176..191 (Ground grid / traffic glow)
    float u_time;                // 192..195
    float u_keystroke_energy;    // 196..199
    float u_shockwave_intensity; // 200..203 (Auth fail / glitch / sirens)
    float u_vortex_speed;        // 204..207 (Flight speed / rocket climb / backspace EMP)
    float u_bass;                // 208..211 (Building height EQ modulation & rooftop strobes)
    float u_mids;                // 212..215 (Holographic billboard animations & hovercraft streams)
    float u_treble;              // 216..219 (Rain sparkle & neon window shimmer)
    float u_searchlight_power;   // 220..223 (Mouse cursor drone searchlight intensity)
    vec2 u_camera_tilt;          // 224..231 (Interactive camera pitch & yaw)
    float u_rain_density;        // 232..235 (Volumetric rain & lens streaks)
    float u_grid_scroll;         // 236..239 (Highway forward flight velocity)
    float u_fog_density;         // 240..243 (Atmospheric cyberpunk smog)
    float u_pad0;                // 244..247
    float u_pad1;                // 248..251
    float u_pad2;                // 252..255
};

// --- Fast GPU Simplex Noise & Hash Functions ---
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

// Skyscraper height generator with audio-reactive EQ modulation
float getBuildingHeight(vec2 cell) {
    float hBase = hash12(cell);
    // Skyscraper heights vary from 4 to 22 units
    float height = 4.0 + hBase * 16.0;

    // Audio Equalizer: Nearby towers pulse to bass, mid-distance to mids, distant to treble
    float distFromHighway = abs(cell.x);
    float eqMod = 0.0;
    if (distFromHighway <= 2.0) {
        eqMod = u_bass * (6.0 + 4.0 * hBase);
    } else if (distFromHighway <= 4.0) {
        eqMod = u_mids * (5.0 + 3.0 * hBase);
    } else {
        eqMod = u_treble * (4.0 + 3.0 * hBase);
    }
    return height + eqMod;
}

// Scene Distance Field (Canyon Highway + Repeating Skyscraper Matrix)
float mapScene(vec3 p, out int hitType, out vec2 outCell, out float outBldgH) {
    hitType = 0; // 0 = nothing, 1 = building, 2 = ground
    outCell = vec2(0.0);
    outBldgH = 0.0;

    // Ground plane at y = 0.0
    float dGround = p.y;

    // Highway central canyon: no buildings inside |x| < 2.5
    float dBuildings = 1000.0;
    vec2 blockSize = vec2(3.0, 4.0);

    if (abs(p.x) >= 2.2) {
        vec2 cell = floor(p.xz / blockSize);
        vec2 localXZ = p.xz - (cell + 0.5) * blockSize;
        float bldgH = getBuildingHeight(cell);

        // Skyscraper box dimensions
        vec2 bldgFootprint = blockSize * vec2(0.40, 0.40);
        vec2 dXZ = abs(localXZ) - bldgFootprint;
        float distXZ = max(dXZ.x, dXZ.y);
        float distY = p.y - bldgH;

        dBuildings = max(distXZ, distY);
        dBuildings = max(dBuildings, -p.y); // Don't march below ground

        outCell = cell;
        outBldgH = bldgH;
    }

    if (dBuildings < dGround) {
        hitType = 1; // Building
        return dBuildings;
    } else {
        hitType = 2; // Ground
        return dGround;
    }
}

void main() {
    vec2 uv = qt_TexCoord0;

    // Keystroke EMP / Backspace Glitch Voltage Sag
    float empGlitch = 0.0;
    if (u_vortex_speed < 0.0) {
        empGlitch = clamp(-u_vortex_speed * 0.5, 0.0, 1.0);
        // Horizontal scanline tearing
        uv.x += sin(uv.y * 120.0 + u_time * 40.0) * 0.015 * empGlitch;
    }

    // Auth Failed Security Lockdown CRT Glitch
    if (u_shockwave_intensity > 0.01) {
        float tear = step(0.92, sin(uv.y * 60.0 + u_time * 25.0));
        uv.x += (hash12(vec2(floor(uv.y * 30.0), u_time)) - 0.5) * 0.05 * u_shockwave_intensity * tear;
    }

    float aspect = u_resolution.x / max(u_resolution.y, 1.0);
    // In Qt Quick / QML, uv.y = 0 is the top, uv.y = 1 is the bottom.
    // In 3D world space, +Y is UP (sky is +Y, highway ground is y = 0).
    // Invert Y coordinate so that screen top (+Y) looks into the sky, and screen bottom (-Y) looks at the road.
    vec2 p = vec2(uv.x - 0.5, 0.5 - uv.y) * vec2(aspect, 1.0);

    // ------------------------------------------------------------------------
    // 1. Camera & View Matrix Setup
    // ------------------------------------------------------------------------
    float forwardSpeed = 10.0 * max(0.15, u_vortex_speed);
    float zTravel = u_time * forwardSpeed + u_grid_scroll;

    vec3 ro = vec3(0.0, 3.8, -zTravel);
    // Camera responds smoothly to pointer & ambient drift
    ro.x += (u_pointer.x - 0.5) * 2.2 + u_ambient_drift.x * 0.6;
    
    // Auth Succeeded Skyward Rocket Launch: camera rockets upwards into the sky
    if (u_vortex_speed > 2.0) {
        float launchBoost = u_vortex_speed - 2.0;
        ro.y += launchBoost * 18.0;
    }

    // Camera Look Direction (Pitch, Yaw, and Rocket Launch Angle)
    float yaw = (u_pointer.x - 0.5) * 0.45 + u_camera_tilt.x;
    float pitch = -(u_pointer.y - 0.5) * 0.35 - 0.08 + u_camera_tilt.y;
    if (u_vortex_speed > 2.0) {
        pitch += min(1.2, (u_vortex_speed - 2.0) * 0.85); // Tilt head upward towards the stars
    }

    vec3 forward = normalize(vec3(sin(yaw), pitch, -cos(yaw)));
    vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
    vec3 up = cross(right, forward);
    vec3 rd = normalize(forward + p.x * right + p.y * up);

    // ------------------------------------------------------------------------
    // 2. Raymarching the Cyber Metropolis
    // ------------------------------------------------------------------------
    float t = 0.2;
    float tMax = 120.0;
    int hitType = 0;
    vec2 hitCell = vec2(0.0);
    float hitBldgH = 0.0;
    bool hit = false;
    vec3 hitPos = vec3(0.0);

    for (int i = 0; i < 52; ++i) {
        vec3 pos = ro + rd * t;
        int curHitType = 0;
        vec2 curCell = vec2(0.0);
        float curBldgH = 0.0;
        float d = mapScene(pos, curHitType, curCell, curBldgH);

        if (d < 0.015 * (1.0 + t * 0.03)) {
            hit = true;
            hitType = curHitType;
            hitCell = curCell;
            hitBldgH = curBldgH;
            hitPos = pos;
            break;
        }
        t += max(d * 0.85, 0.04);
        if (t > tMax) break;
    }

    // ------------------------------------------------------------------------
    // 3. Sky, Synthwave Sun & Horizon Lighting
    // ------------------------------------------------------------------------
    // Retro synthwave sky gradient (Violet Zenith -> Magenta/Orange Horizon)
    float horizonGradient = clamp(rd.y * 3.0 + 0.15, 0.0, 1.0);
    vec3 skyColor = mix(u_color_neon1.rgb * 0.35, u_color_sky.rgb, horizonGradient);

    // Segmented Synthwave Sunset on the distant horizon
    float sunY = rd.y - 0.06;
    float sunX = rd.x - forward.x * 0.2;
    float sunDist = length(vec2(sunX, sunY));
    if (sunDist < 0.35 && rd.y > -0.02) {
        // Horizontal synthwave blinds / horizontal slats
        float slats = step(0.22, fract((sunY + 0.35) * 26.0));
        float sunAlpha = smoothstep(0.35, 0.32, sunDist) * slats;
        vec3 sunColor = mix(u_color_neon2.rgb, vec3(1.0, 0.95, 0.3), clamp(sunY * 4.0 + 0.5, 0.0, 1.0));
        skyColor = mix(skyColor, sunColor * 1.8, sunAlpha);
    }

    // Distant Neon Wireframe Grid on Horizon Mountains
    if (rd.y > 0.0 && rd.y < 0.15) {
        float mtn = sin(rd.x * 12.0) * 0.04 + sin(rd.x * 32.0) * 0.015 + 0.05;
        if (rd.y < mtn) {
            float gridLine = step(0.85, fract(rd.x * 60.0)) + step(0.85, fract(rd.y * 60.0));
            skyColor = mix(u_color_sky.rgb * 0.2, u_color_grid.rgb * 1.2, gridLine * 0.6);
        }
    }

    vec3 sceneColor = skyColor;

    // ------------------------------------------------------------------------
    // 4. Surface Shading (Wet Asphalt Highway & Skyscraper Facades)
    // ------------------------------------------------------------------------
    if (hit) {
        if (hitType == 2) {
            // Ground / Wet Elevated Neon Expressway
            vec2 roadUV = hitPos.xz;
            // Perspective Grid Lines
            float gridMajorX = smoothstep(0.08, 0.02, abs(fract(roadUV.x * 0.5) - 0.5));
            float gridMajorZ = smoothstep(0.08, 0.02, abs(fract(roadUV.y * 0.25) - 0.5));
            float roadGrid = max(gridMajorX, gridMajorZ);

            // Center neon divider line
            float centerDivider = smoothstep(0.04, 0.01, abs(roadUV.x)) * (0.8 + 0.4 * sin(roadUV.y * 2.0 - u_time * 8.0));

            // Highway traffic streams (Dual lanes of hyper-speed hovercraft)
            // Left lane (x in [-2.0, -0.6]): Crimson/Pink taillights moving forward
            float trafficLeft = smoothstep(0.35, 0.05, abs(roadUV.x + 1.2)) *
                                pow(fract(-roadUV.y * 0.8 + u_time * (12.0 + u_mids * 15.0)), 8.0);
            // Right lane (x in [0.6, 2.0]): Cyan headlights rushing towards camera
            float trafficRight = smoothstep(0.35, 0.05, abs(roadUV.x - 1.2)) *
                                 pow(fract(roadUV.y * 0.8 + u_time * (14.0 + u_mids * 15.0)), 8.0);

            // Keystroke supersonic vehicle boost: blazing laser vehicle speeding ahead
            float keyBoost = 0.0;
            if (u_keystroke_energy > 0.02) {
                float keyLane = (u_keystroke_pos.x - 0.5) * 3.0;
                keyBoost = smoothstep(0.2, 0.02, abs(roadUV.x - keyLane)) *
                           pow(fract(-roadUV.y * 0.5 + u_time * 28.0), 4.0) * u_keystroke_energy * 3.0;
            }

            // Wet asphalt surface with puddles & reflections
            float puddleMask = smoothstep(0.35, 0.65, noise2D(roadUV * 0.4));
            vec3 asphaltColor = vec3(0.02, 0.02, 0.035);
            vec3 gridColor = u_color_grid.rgb * roadGrid * 0.9;
            vec3 dividerColor = u_color_neon2.rgb * centerDivider * 2.0;
            vec3 trafficColor = u_color_neon2.rgb * trafficLeft * 3.5 + u_color_neon1.rgb * trafficRight * 3.5;
            trafficColor += vec3(1.0, 1.0, 1.0) * keyBoost;

            // Wet reflection of skyline/horizon
            vec3 reflDir = reflect(rd, vec3(0.0, 1.0, 0.0));
            vec3 roadRefl = mix(u_color_neon1.rgb, u_color_sky.rgb, clamp(reflDir.y * 2.0, 0.0, 1.0)) * 0.45;

            sceneColor = asphaltColor + gridColor + dividerColor + trafficColor + roadRefl * puddleMask;

        } else if (hitType == 1) {
            // Skyscraper Facade Shading
            vec2 cell = hitCell;
            float bldgH = hitBldgH;
            float cellHash = hash12(cell);

            // Procedural Illuminated Window Matrix
            vec2 winUV = vec2(hitPos.x + hitPos.z, hitPos.y);
            float winGridX = step(0.42, fract(winUV.x * 2.8));
            float winGridY = step(0.48, fract(winUV.y * 2.4));
            float winActive = step(0.38, hash12(floor(winUV * vec2(2.8, 2.4)) + cell * 7.1));

            // Keystroke Window Overdrive: entire building floors light up on typing
            float keyOverdrive = 0.0;
            if (u_keystroke_energy > 0.05) {
                float keyFloor = step(0.5, sin(hitPos.y * 3.0 + u_time * 15.0));
                keyOverdrive = keyFloor * u_keystroke_energy * 1.5;
            }

            // Window neon colors: alternating cyan, amber, and hot magenta
            vec3 winColor = mix(u_color_neon1.rgb, u_color_neon2.rgb, cellHash);
            winColor = mix(winColor, vec3(1.0, 0.95, 0.8), 0.35); // Warm interior glow
            float windowLum = (winGridX * winGridY * winActive + keyOverdrive);

            // Dark reflective glass/carbon composite building facade
            vec3 facadeColor = vec3(0.015, 0.018, 0.025);
            facadeColor += winColor * windowLum * 1.8;

            // Rooftop Aviation Hazard Strobes (synchronized to sub-bass kick)
            if (hitPos.y > bldgH - 0.25) {
                float strobe = pow(sin(u_time * 16.0 + cellHash * 6.28), 12.0) * (0.8 + u_bass * 2.2);
                facadeColor += vec3(1.0, 0.1, 0.05) * strobe * 3.5;
            }

            // Holographic Billboard on select skyscraper spires
            if (cellHash > 0.72 && hitPos.y > 4.0 && hitPos.y < 9.0) {
                float boardScroll = fract(hitPos.y * 0.8 - u_time * (1.5 + u_mids * 3.0));
                float boardPattern = step(0.3, boardScroll) * (0.7 + 0.6 * sin(hitPos.x * 10.0));
                vec3 boardColor = mix(u_color_neon1.rgb, u_color_neon2.rgb, sin(u_time * 2.0) * 0.5 + 0.5);
                facadeColor += boardColor * boardPattern * 2.2;
            }

            sceneColor = facadeColor;
        }

        // --------------------------------------------------------------------
        // 5. Interactive Drone Volumetric Searchlight
        // --------------------------------------------------------------------
        // Originating from camera/drone, tracking pointer position in 3D world
        vec3 searchTarget = ro + normalize(forward + (u_pointer.x - 0.5) * right * 1.5 + (-(u_pointer.y - 0.5) * up * 1.2)) * 30.0;
        vec3 droneToHit = normalize(hitPos - ro);
        vec3 droneDir = normalize(searchTarget - ro);
        float spotDot = dot(droneToHit, droneDir);
        if (spotDot > 0.94) {
            float spotIntensity = smoothstep(0.94, 0.985, spotDot) * (1.2 + u_searchlight_power);
            // Searchlight illuminates facades and road with crisp cool-white spotlight
            sceneColor += vec3(0.85, 0.95, 1.0) * spotIntensity * (20.0 / (t + 10.0));
        }

        // --------------------------------------------------------------------
        // 6. Volumetric Cyberpunk Smog & Distance Fog
        // --------------------------------------------------------------------
        float fogFactor = 1.0 - exp(-t * (0.018 + u_fog_density * 0.025));
        vec3 fogColor = mix(u_color_sky.rgb * 0.35, u_color_neon1.rgb * 0.25, clamp(hitPos.y * 0.05, 0.0, 1.0));
        sceneColor = mix(sceneColor, fogColor, fogFactor);
    }

    // ------------------------------------------------------------------------
    // 7. Atmospheric Rain, Lens Condensation & Weather
    // ------------------------------------------------------------------------
    if (u_rain_density > 0.05) {
        // High-speed diagonal rain streaks falling downwards (from top uv.y=0 to bottom uv.y=1)
        vec2 rainCoord = vec2(uv.x * aspect + uv.y * 0.20, uv.y);
        vec2 rainCell = vec2(rainCoord.x * 130.0 - u_time * 6.0, rainCoord.y * 28.0 - u_time * 52.0);
        vec2 rainId = floor(rainCell);
        float rainRand = hash12(rainId);

        float streakY = fract(rainCell.y); // Tapered streak head
        float streakX = 1.0 - abs(fract(rainCell.x) - 0.5) * 2.0;
        float rainStreak = pow(rainRand, 24.0) * pow(streakY, 3.5) * smoothstep(0.0, 0.5, streakX);
        sceneColor += vec3(0.75, 0.9, 1.0) * rainStreak * (0.8 + u_treble * 1.5) * u_rain_density;

        // Condensation lens droplets running downwards on the camera glass
        vec2 dropUV = uv * vec2(28.0 * aspect, 18.0);
        vec2 dropGrid = floor(vec2(dropUV.x, dropUV.y - u_time * 0.4));
        float dropRand = hash12(dropGrid);
        if (dropRand > 0.88) {
            float dropY = fract(dropUV.y - u_time * 0.4);
            float dropDist = length(vec2(fract(dropUV.x) - 0.5, dropY - 0.5));
            float droplet = smoothstep(0.22, 0.04, dropDist) * 0.35;
            sceneColor += vec3(0.85, 0.95, 1.0) * droplet;
        }
    }

    // ------------------------------------------------------------------------
    // 8. Auth State Phenomena: Lockdown Sirens & Skyward Launch
    // ------------------------------------------------------------------------
    // Wrong Password: Red Security Protocol Klaxons & Sweeping Searchlights
    if (u_shockwave_intensity > 0.01) {
        float sirenAngle = u_time * 8.0;
        float sirenSweep = sin(atan(p.y, p.x) * 3.0 + sirenAngle) * 0.5 + 0.5;
        vec3 alarmRed = vec3(1.0, 0.05, 0.02);
        sceneColor = mix(sceneColor, alarmRed * (sceneColor * 1.5 + vec3(0.3)), u_shockwave_intensity * (0.4 + 0.6 * sirenSweep));
        // CRT horizontal scanlines
        sceneColor *= (0.85 + 0.15 * sin(uv.y * 360.0));
    }

    // Backspace EMP Power Brownout: Flicker & Voltage Sag
    if (empGlitch > 0.01) {
        float flicker = 0.5 + 0.5 * sin(u_time * 85.0);
        float lum = dot(sceneColor, vec3(0.299, 0.587, 0.114));
        sceneColor = mix(sceneColor, vec3(lum) * 0.4, empGlitch * flicker);
    }

    // Correct Password: Emerald & Gold Grid Overload (Skyward Ascent)
    if (u_vortex_speed > 2.0) {
        float warpSpeed = u_vortex_speed - 2.0;
        vec3 gridOverload = mix(vec3(0.1, 1.0, 0.4), vec3(1.0, 0.9, 0.2), sin(u_time * 8.0) * 0.5 + 0.5);
        sceneColor = mix(sceneColor, gridOverload * 2.0, clamp(warpSpeed * 0.5, 0.0, 0.9));
    }

    fragColor = vec4(sceneColor, 1.0) * qt_Opacity;
}
