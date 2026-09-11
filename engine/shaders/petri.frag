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
    vec4 u_color_bg;
    vec4 u_color_membrane;
    vec4 u_color_organelle;
    vec4 u_color_glow;
    float u_time;
    float u_keystroke_energy;
    float u_shockwave_intensity;
    float u_vortex_speed;
    float u_bass;
    float u_mids;
    float u_treble;
    float u_aperture_mode;
};

// --- Fast GPU Simplex Noise & Hash Functions ---
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
    mat2 rot = mat2(cos(0.45), sin(0.45), -sin(0.45), cos(0.45));
    for (int i = 0; i < 4; ++i) {
        v += a * noise2D(p);
        p = rot * p * 2.05 + vec2(1.7, 0.9);
        a *= 0.5;
    }
    return v;
}

// ----------------------------------------------------------------------------
// Continuous Lenia Kernel: Concentric Multi-Ring Soliton Potential
// ----------------------------------------------------------------------------
float leniaKernel(float r, float r0, float sigma) {
    float d = (r - r0) / sigma;
    return exp(-0.5 * d * d);
}

// Evaluates an autonomous living organism with Lenia morphology, cytokinesis & fluttering cilia
float evaluateOrganism(
    vec2 p,
    vec2 center,
    float baseRadius,
    float lobes,
    float phaseSpeed,
    float time,
    float audioBass,
    float audioTreble,
    float mitosisFactor,
    float cystFactor,
    float osmoticFactor
) {
    vec2 offset = p - center;
    float dist = length(offset);
    float angle = atan(offset.y, offset.x);

    // 1. Biological Cytokinesis (Mitosis Cleavage Furrow)
    if (mitosisFactor > 0.02) {
        float splitDist = mitosisFactor * 0.15;
        vec2 splitAxis = vec2(cos(time * 0.35 + lobes * 0.7), sin(time * 0.35 + lobes * 0.7));
        vec2 c1 = center + splitAxis * splitDist;
        vec2 c2 = center - splitAxis * splitDist;
        float d1 = length(p - c1);
        float d2 = length(p - c2);

        // Smooth contractile ring furrow
        float k = 0.09 * (1.0 - clamp(mitosisFactor * 0.65, 0.0, 0.92));
        float h = clamp(0.5 + 0.5 * (d2 - d1) / (k + 0.0001), 0.0, 1.0);
        dist = mix(d2, d1, h) - k * h * (1.0 - h);
    }

    // 2. Defensive Spherical Cyst & Osmotic Contraction
    float defenseContract = max(cystFactor, osmoticFactor);
    float effectiveRadius = baseRadius * mix(1.0 + audioBass * 0.35, 0.52, defenseContract);

    // 3. Harmonic angular lobe undulation (continuous radial symmetry)
    float lobeMod = 0.14 * sin(lobes * angle + time * phaseSpeed) * (1.0 - defenseContract * 0.85);
    float undulatingRing = dist / (effectiveRadius * (1.0 + lobeMod) + 0.0001);

    // 4. Multi-ring concentric Lenia bell curves (organelle core, middle cytoplasm, outer membrane)
    float coreDensity = leniaKernel(undulatingRing, 0.20, 0.16);
    float cytoplasm = 0.75 * leniaKernel(undulatingRing, 0.55, 0.22);
    float outerMembrane = 0.90 * leniaKernel(undulatingRing, 0.88, 0.14);

    // 5. Fine pseudopod membrane undulations using procedural curl perturbation
    float pseudopod = 0.08 * fbm(p * 8.0 + vec2(cos(time * 0.4), sin(time * 0.4))) * (1.0 - defenseContract);

    // 6. Fluttering Cilia Fringe around outer lipid bilayer
    float ciliaWave = sin(angle * (lobes * 6.0 + 20.0) + time * 26.0);
    float ciliaMask = smoothstep(0.80, 0.92, undulatingRing) * (1.0 - smoothstep(0.95, 1.12, undulatingRing));
    float cilia = ciliaMask * (0.10 + audioTreble * 0.40) * (ciliaWave * 0.5 + 0.5) * (1.0 - defenseContract);

    // 7. Cytoplasmic Vacuoles & metabolic streaming
    float vacuoles = 0.18 * noise2D(p * 26.0 - vec2(time * 0.2, -time * 0.15)) * coreDensity;

    return clamp(coreDensity + cytoplasm + outerMembrane + pseudopod + cilia + vacuoles, 0.0, 1.0);
}

// Evaluates the full population of all 5 continuous organisms simultaneously
float evaluateAllOrganisms(
    vec2 p,
    vec2 org1Center,
    vec2 org2Center,
    vec2 org3Center,
    vec2 org4Center,
    vec2 org5Center,
    float t,
    float bass,
    float treble,
    float mitosisFactor,
    float cystFactor,
    float osmoticFactor
) {
    float field = 0.0;
    // Organism 1: Large Central Amoeba (orbicular crawler)
    field += evaluateOrganism(p, org1Center, 0.16, 5.0, 0.8, t, bass, treble, mitosisFactor, cystFactor, osmoticFactor);
    // Organism 2: Soliton Glider (harmonic orbital swimmer)
    field += 0.85 * evaluateOrganism(p, org2Center, 0.11, 3.0, 1.4, t, bass * 0.8, treble * 1.1, mitosisFactor * 0.7, cystFactor, osmoticFactor);
    // Organism 3: Agile Multi-lobed Crawler
    field += 0.75 * evaluateOrganism(p, org3Center, 0.09, 4.0, -1.8, t, bass * 0.6, treble * 0.9, 0.0, cystFactor, osmoticFactor);
    // Organism 4 & 5: Small Colony Wanderers
    field += 0.60 * evaluateOrganism(p, org4Center, 0.07, 6.0, 2.2, t, bass * 0.5, treble * 1.2, 0.0, cystFactor, osmoticFactor);
    field += 0.60 * evaluateOrganism(p, org5Center, 0.065, 3.0, -1.2, t, bass * 0.5, treble * 1.2, 0.0, cystFactor, osmoticFactor);
    return field;
}

void main() {
    vec2 uv = qt_TexCoord0;
    float aspect = u_resolution.x / max(u_resolution.y, 1.0);
    vec2 p = uv;
    p.x *= aspect;

    vec2 centerP = vec2(0.5 * aspect, 0.5);

    // --- Microscope Slide Aperture Optics ---
    vec2 slideOffset = p - centerP;
    float slideDist = length(slideOffset);
    
    // Circular aperture diameter fits comfortably within screen height with margin; or expands to fullscreen
    float dishRadius = mix(2.5, 0.47, u_aperture_mode);

    float glassRim = smoothstep(dishRadius - 0.025, dishRadius, slideDist) * u_aperture_mode;
    float insideDish = mix(1.0, 1.0 - smoothstep(dishRadius - 0.005, dishRadius + 0.018, slideDist), u_aperture_mode);

    // Beveled glass optical refraction highlight & rim glint
    float glassBevel = pow(clamp(1.0 - abs(slideDist - (dishRadius - 0.008)) * 80.0, 0.0, 1.0), 3.0) * glassRim;

    // Micrometric stage graduation tick marks (authentic research microscope aesthetic)
    float tickAngle = atan(slideOffset.y, slideOffset.x);
    float majorTicks = smoothstep(0.97, 1.0, cos(tickAngle * 24.0)) * smoothstep(dishRadius - 0.022, dishRadius - 0.010, slideDist);
    float minorTicks = smoothstep(0.985, 1.0, cos(tickAngle * 96.0)) * smoothstep(dishRadius - 0.016, dishRadius - 0.010, slideDist);
    float stageTicks = (majorTicks * 0.7 + minorTicks * 0.35) * glassRim;

    // --- Chemotaxis, Behavioral AI & Environmental Vectors ---
    vec2 pointerP = u_pointer;
    pointerP.x *= aspect;

    vec2 keystrokeP = u_keystroke_pos;
    keystrokeP.x *= aspect;

    vec2 beatCenterP = u_beat_center;
    beatCenterP.x *= aspect;

    float t = u_time * u_vortex_speed;
    float cystFactor = smoothstep(0.1, 0.9, u_shockwave_intensity);
    float mitosisFactor = smoothstep(0.3, 1.8, u_keystroke_energy);
    float osmoticFactor = clamp(-u_vortex_speed * 0.6, 0.0, 1.0);

    // Fluid stirring displacement from mouse momentum
    vec2 fluidStir = u_pointer_vel * 0.4;

    // Oceanic ambient drift
    vec2 currentP = p - (u_ambient_drift * 0.5 + fluidStir);

    // Dynamic environmental vectors
    float mouseSpeed = length(u_pointer_vel);
    float predatorPanic = smoothstep(0.12, 0.55, mouseSpeed);
    float feedAttract = smoothstep(0.04, 0.60, u_keystroke_energy);
    float idleColony = smoothstep(0.70, 0.25, u_vortex_speed);

    // ------------------------------------------------------------------------
    // Continuous Organisms Population Trajectories
    // ------------------------------------------------------------------------
    // Organism 1: Central Amoeba (orbicular crawler)
    vec2 org1Center = beatCenterP + vec2(
        0.06 * cos(t * 0.4) + fluidStir.x,
        0.05 * sin(t * 0.5) + fluidStir.y
    );
    vec2 toPointer1 = pointerP - org1Center;
    // Attracted to pointer pheromones when slow; flees when cursor moves fast
    org1Center += mix(toPointer1 * 0.22, -normalize(toPointer1 + vec2(0.001)) * 0.20, predatorPanic);
    // Swarms keystroke nutrient sparks when typing
    org1Center = mix(org1Center, keystrokeP, feedAttract * 0.45);

    // Organism 2: Soliton Glider (harmonic orbital swimmer)
    float gliderAngle = t * 0.28;
    vec2 org2Center = centerP + vec2(
        0.28 * cos(gliderAngle) * aspect,
        0.18 * sin(gliderAngle * 1.3)
    );
    vec2 toPointer2 = pointerP - org2Center;
    org2Center += mix(toPointer2 * 0.15, -normalize(toPointer2 + vec2(0.001)) * 0.22, predatorPanic);
    org2Center = mix(org2Center, keystrokeP, feedAttract * 0.35);

    // Organism 3: Agile Multi-lobed Crawler
    float crawlerAngle = -t * 0.38 + 2.0;
    vec2 org3Center = centerP + vec2(
        0.22 * sin(crawlerAngle),
        0.22 * cos(crawlerAngle * 0.9)
    );
    vec2 toPointer3 = pointerP - org3Center;
    org3Center += mix(vec2(0.0), -normalize(toPointer3 + vec2(0.001)) * 0.25, predatorPanic);
    org3Center = mix(org3Center, keystrokeP, feedAttract * 0.25);

    // Organisms 4 & 5: Small Colony Wanderers (cluster around central amoeba during idle)
    vec2 org4Base = centerP + vec2(0.18 * cos(t * 0.6 + 4.0), 0.26 * sin(t * 0.4 + 1.0));
    vec2 org5Base = centerP + vec2(-0.24 * cos(t * 0.3 + 2.5), -0.16 * sin(t * 0.5 + 3.0));
    vec2 org4Center = mix(org4Base, org1Center + vec2(0.10, 0.06), idleColony * 0.65);
    vec2 org5Center = mix(org5Base, org1Center - vec2(0.08, 0.09), idleColony * 0.70);
    org4Center = mix(org4Center, keystrokeP, feedAttract * 0.30);
    org5Center = mix(org5Center, keystrokeP, feedAttract * 0.30);

    // Evaluate total continuous density field across all organisms
    float organismField = evaluateAllOrganisms(
        currentP,
        org1Center,
        org2Center,
        org3Center,
        org4Center,
        org5Center,
        t,
        u_bass,
        u_treble,
        mitosisFactor,
        cystFactor,
        osmoticFactor
    );

    // ------------------------------------------------------------------------
    // Nutrient Droplet Injection (Keystrokes & Mitosis Sparks)
    // ------------------------------------------------------------------------
    float nutrientDist = length(p - keystrokeP);
    float nutrientSpark = exp(-nutrientDist * 22.0) * (0.8 + 0.6 * sin(t * 8.0)) * (u_keystroke_energy + 0.1);
    float nutrientRings = sin(nutrientDist * 45.0 - t * 6.0) * exp(-nutrientDist * 8.0) * u_keystroke_energy;
    float nutrientGlow = clamp(nutrientSpark + max(0.0, nutrientRings), 0.0, 1.5);

    // ------------------------------------------------------------------------
    // Cursor Pheromone Trail (Chemotaxis Emission)
    // ------------------------------------------------------------------------
    float cursorDist = length(p - pointerP);
    float cursorPheromone = exp(-cursorDist * 16.0) * (0.4 + 0.3 * u_mids);

    // ------------------------------------------------------------------------
    // Toxic Acidic Wave (Wrong Password Shockwave)
    // ------------------------------------------------------------------------
    float shockDist = length(p - centerP);
    float shockWavePhase = (t * 2.5) - shockDist * 6.0;
    float shockRing = exp(-pow(shockDist - (u_shockwave_intensity * 0.7), 2.0) * 35.0) * u_shockwave_intensity;

    // ------------------------------------------------------------------------
    // Optical Phase-Contrast Shading & Membrane Specular Highlights
    // ------------------------------------------------------------------------
    const float eps = 0.005;
    vec2 pDx = currentP + vec2(eps, 0.0);
    vec2 pDy = currentP + vec2(0.0, eps);
    float densDx = evaluateAllOrganisms(
        pDx,
        org1Center,
        org2Center,
        org3Center,
        org4Center,
        org5Center,
        t,
        u_bass,
        u_treble,
        mitosisFactor,
        cystFactor,
        osmoticFactor
    );
    float densDy = evaluateAllOrganisms(
        pDy,
        org1Center,
        org2Center,
        org3Center,
        org4Center,
        org5Center,
        t,
        u_bass,
        u_treble,
        mitosisFactor,
        cystFactor,
        osmoticFactor
    );
    vec2 gradient = vec2(densDx - organismField, densDy - organismField) / eps;

    vec3 normal = normalize(vec3(-gradient.x, -gradient.y, 0.22));
    vec3 lightDir = normalize(vec3(0.5, 0.6, 0.8)); // Oblique darkfield condenser illumination
    float diffuse = clamp(dot(normal, lightDir), 0.0, 1.0);

    // Specular Fresnel rim on lipid bilayer membranes
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    float fresnel = pow(1.0 - clamp(dot(normal, viewDir), 0.0, 1.0), 3.0);
    vec3 halfVec = normalize(lightDir + viewDir);
    float specular = pow(clamp(dot(normal, halfVec), 0.0, 1.0), 16.0);

    // High-frequency interior organelle fluorescence (vibrates with mids & treble)
    float organelleNoise = fbm(p * 24.0 + vec2(t * 0.8, -t * 0.6));
    float organelleScintillation = smoothstep(0.38, 0.85, organismField) * organelleNoise * (0.6 + u_treble * 2.2 + u_mids * 1.4);

    // ------------------------------------------------------------------------
    // Bioluminescent Color Composition & Optical Staining
    // ------------------------------------------------------------------------
    vec3 colBg = u_color_bg.rgb;
    vec3 colMembrane = u_color_membrane.rgb;
    vec3 colOrganelle = u_color_organelle.rgb;
    vec3 colGlow = u_color_glow.rgb;

    // Colloidal suspended dust particles in darkfield background
    float colloidalDust = smoothstep(0.72, 0.98, noise2D(p * 18.0 + vec2(t * 0.05, t * 0.02))) * 0.12;

    // Chladni cymatic modal resonance nodes from acoustic harmonics
    float cymaticPattern = cos(p.x * 24.0) * cos(p.y * 24.0) - cos(p.x * 48.0 + p.y * 48.0) * 0.5;
    float cymaticGlow = smoothstep(0.3, 0.8, abs(cymaticPattern)) * (u_mids * 0.35 + u_treble * 0.25);

    // Darkfield background tint with subtle radial falloff & cymatics
    vec3 finalColor = colBg * (1.0 - 0.25 * slideDist) + colGlow * (colloidalDust + cymaticGlow * 0.15);

    // Acoustic pressure wave across the petri dish substrate
    float acousticWave = sin(slideDist * 32.0 - t * 8.0) * exp(-slideDist * 2.5) * (u_bass * 0.35);
    finalColor += colGlow * max(0.0, acousticWave);

    // Composite living organisms with translucency and subsurface scattering
    vec3 organismColor = mix(colMembrane, colOrganelle, organelleScintillation);
    organismColor += vec3(specular * 0.9) * colGlow;
    organismColor += vec3(fresnel * 0.6) * colMembrane;

    // Acidic toxicity color shift (crimson / amber necrosis during auth failure)
    if (u_shockwave_intensity > 0.01) {
        vec3 toxicColor = vec3(1.0, 0.15, 0.05) * shockRing * 2.2;
        organismColor = mix(organismColor, vec3(0.9, 0.2, 0.1), cystFactor * 0.85);
        finalColor += toxicColor;
    }

    // Backspace Osmotic Reverse-Pressure Wave
    if (osmoticFactor > 0.01) {
        float osmoticDist = length(p - keystrokeP);
        float osmoticWave = sin(osmoticDist * 36.0 + t * 14.0) * exp(-osmoticDist * 8.0) * osmoticFactor;
        finalColor += colMembrane * max(0.0, osmoticWave) * 1.6;
    }

    // Nutrient Droplet Glow (Emerald / Cyan Phosphor)
    finalColor += nutrientGlow * colOrganelle * 1.8;

    // Cursor Pheromone Trail (Soft Bioluminescent Aura)
    finalColor += cursorPheromone * colGlow * 1.2;

    // Blend organisms over darkfield medium
    float alpha = smoothstep(0.08, 0.95, organismField);
    finalColor = mix(finalColor, organismColor, alpha);

    // External Halo / Bioluminescent Bloom
    float bloomHalo = smoothstep(0.01, 0.40, organismField) * (0.35 + u_bass * 0.85);
    finalColor += bloomHalo * colGlow * 0.55;

    // ------------------------------------------------------------------------
    // Microscope Apparatus Presentation (Slide Glass vs Stage Enclosure)
    // ------------------------------------------------------------------------
    if (u_aperture_mode > 0.01) {
        vec3 stageColor = vec3(0.02, 0.03, 0.05); // Matte dark graphite stage
        float stageNoise = noise2D(p * 35.0) * 0.012;
        stageColor += stageNoise;
        
        vec3 glassEdgeColor = vec3(0.12, 0.20, 0.32) * glassRim;
        finalColor = mix(stageColor, finalColor, insideDish);
        finalColor = mix(finalColor, glassEdgeColor, glassRim * 0.6);
        finalColor += vec3(glassBevel * 0.75) + colGlow * stageTicks * 0.85;
    }

    fragColor = vec4(finalColor, 1.0) * qt_Opacity;
}
