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

// Evaluates an autonomous living organism with Lenia concentric morphology
float evaluateOrganism(vec2 p, vec2 center, float baseRadius, float lobes, float phaseSpeed, float time, float audioPulse, float mitosisFactor, float cystFactor) {
    vec2 offset = p - center;
    float dist = length(offset);
    float angle = atan(offset.y, offset.x);

    // Mitosis: If metabolic energy is high, split into two daughter nuclei along an axis
    if (mitosisFactor > 0.05) {
        float splitDist = mitosisFactor * 0.12;
        vec2 splitAxis = vec2(cos(time * 0.5), sin(time * 0.5));
        vec2 c1 = center + splitAxis * splitDist;
        vec2 c2 = center - splitAxis * splitDist;
        float d1 = length(p - c1);
        float d2 = length(p - c2);
        dist = min(d1, d2) + 0.3 * mitosisFactor * (d1 + d2 - 2.0 * min(d1, d2));
    }

    // Defensive Cyst formation during toxic shock: contract into dense sphere
    float effectiveRadius = baseRadius * mix(1.0 + audioPulse * 0.18, 0.55, cystFactor);

    // Harmonic angular lobe modulation (Lenia continuous symmetry)
    float lobeMod = 0.14 * sin(lobes * angle + time * phaseSpeed);
    float undulatingRing = dist / (effectiveRadius * (1.0 + lobeMod));

    // Multi-ring concentric Lenia bell curves (organelle core, middle cytoplasm, outer membrane)
    float coreDensity = leniaKernel(undulatingRing, 0.20, 0.16);
    float cytoplasm = 0.75 * leniaKernel(undulatingRing, 0.55, 0.22);
    float outerMembrane = 0.90 * leniaKernel(undulatingRing, 0.88, 0.14);

    // Add fine pseudopod membrane undulations using procedural curl perturbation
    float pseudopod = 0.08 * fbm(p * 8.0 + vec2(cos(time * 0.4), sin(time * 0.4)));

    return clamp(coreDensity + cytoplasm + outerMembrane + pseudopod, 0.0, 1.0);
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
    float mitosisFactor,
    float cystFactor
) {
    float field = 0.0;
    // Organism 1: Large Central Amoeba (orbicular crawler)
    field += evaluateOrganism(p, org1Center, 0.16, 5.0, 0.8, t, bass, mitosisFactor, cystFactor);
    // Organism 2: Soliton Glider (harmonic orbital swimmer)
    field += 0.85 * evaluateOrganism(p, org2Center, 0.11, 3.0, 1.4, t, bass * 0.8, mitosisFactor * 0.7, cystFactor);
    // Organism 3: Agile Multi-lobed Crawler
    field += 0.75 * evaluateOrganism(p, org3Center, 0.09, 4.0, -1.8, t, bass * 0.6, 0.0, cystFactor);
    // Organism 4 & 5: Small Colony Wanderers
    field += 0.60 * evaluateOrganism(p, org4Center, 0.07, 6.0, 2.2, t, bass * 0.5, 0.0, cystFactor);
    field += 0.60 * evaluateOrganism(p, org5Center, 0.065, 3.0, -1.2, t, bass * 0.5, 0.0, cystFactor);
    return field;
}

void main() {
    vec2 uv = qt_TexCoord0;
    float aspect = u_resolution.x / max(u_resolution.y, 1.0);
    vec2 p = uv;
    p.x *= aspect;

    vec2 centerP = vec2(0.5 * aspect, 0.5);

    // --- Circular Petri Dish Slide Optics ---
    vec2 slideOffset = p - centerP;
    float slideDist = length(slideOffset);
    float dishRadius = 0.55 * aspect;

    // Darkfield background illumination & microscopic glass rim
    float glassRim = smoothstep(dishRadius - 0.03, dishRadius, slideDist);
    float insideDish = 1.0 - smoothstep(dishRadius - 0.005, dishRadius + 0.015, slideDist);

    // --- Chemotaxis & Environmental Vectors ---
    vec2 pointerP = u_pointer;
    pointerP.x *= aspect;

    vec2 keystrokeP = u_keystroke_pos;
    keystrokeP.x *= aspect;

    vec2 beatCenterP = u_beat_center;
    beatCenterP.x *= aspect;

    float t = u_time * u_vortex_speed;
    float cystFactor = smoothstep(0.1, 0.9, u_shockwave_intensity);
    float mitosisFactor = smoothstep(0.3, 1.8, u_keystroke_energy);

    // Fluid stirring displacement from mouse momentum
    vec2 fluidStir = u_pointer_vel * 0.4;

    // Oceanic ambient drift
    vec2 currentP = p - (u_ambient_drift * 0.5 + fluidStir);

    // ------------------------------------------------------------------------
    // Continuous Organisms Population Trajectories
    // ------------------------------------------------------------------------
    // Organism 1: Central Amoeba (attracted to beat epicenter & cursor)
    vec2 org1Center = beatCenterP + vec2(
        0.06 * cos(t * 0.4) + fluidStir.x,
        0.05 * sin(t * 0.5) + fluidStir.y
    );
    org1Center = mix(org1Center, pointerP, 0.22);

    // Organism 2: Soliton Glider (harmonic orbital path, tracks cursor)
    float gliderAngle = t * 0.25;
    vec2 org2Center = centerP + vec2(
        0.28 * cos(gliderAngle) * aspect,
        0.18 * sin(gliderAngle * 1.3)
    );
    org2Center = mix(org2Center, pointerP, 0.15);

    // Organism 3: Agile Multi-lobed Crawler
    float crawlerAngle = -t * 0.35 + 2.0;
    vec2 org3Center = centerP + vec2(
        0.22 * sin(crawlerAngle),
        0.22 * cos(crawlerAngle * 0.9)
    );

    // Organisms 4 & 5: Small Colony Wanderers
    vec2 org4Center = centerP + vec2(0.18 * cos(t * 0.6 + 4.0), 0.26 * sin(t * 0.4 + 1.0));
    vec2 org5Center = centerP + vec2(-0.24 * cos(t * 0.3 + 2.5), -0.16 * sin(t * 0.5 + 3.0));

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
        mitosisFactor,
        cystFactor
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
    // Mathematically consistent finite difference gradient across all 5 organisms
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
        mitosisFactor,
        cystFactor
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
        mitosisFactor,
        cystFactor
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
    float organelleScintillation = smoothstep(0.45, 0.85, organismField) * organelleNoise * (0.6 + u_treble * 1.5);

    // ------------------------------------------------------------------------
    // Bioluminescent Color Composition & Optical Staining
    // ------------------------------------------------------------------------
    vec3 colBg = u_color_bg.rgb;
    vec3 colMembrane = u_color_membrane.rgb;
    vec3 colOrganelle = u_color_organelle.rgb;
    vec3 colGlow = u_color_glow.rgb;

    // Colloidal suspended dust particles in darkfield background
    float colloidalDust = smoothstep(0.72, 0.98, noise2D(p * 18.0 + vec2(t * 0.05, t * 0.02))) * 0.12;

    // Darkfield background tint with subtle radial falloff
    vec3 finalColor = colBg * (1.0 - 0.3 * slideDist) + colGlow * colloidalDust;

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

    // Nutrient Droplet Glow (Emerald / Cyan Phosphor)
    finalColor += nutrientGlow * colOrganelle * 1.8;

    // Cursor Pheromone Trail (Soft Bioluminescent Aura)
    finalColor += cursorPheromone * colGlow * 1.2;

    // Blend organisms over darkfield medium
    float alpha = smoothstep(0.08, 0.95, organismField);
    finalColor = mix(finalColor, organismColor, alpha);

    // External Halo / Bioluminescent Bloom
    float bloomHalo = smoothstep(0.01, 0.40, organismField) * (0.35 + u_bass * 0.4);
    finalColor += bloomHalo * colGlow * 0.45;

    // Microscope Glass Rim with Chromatic Aberration & Dark Vignette
    vec3 glassEdgeColor = vec3(0.08, 0.15, 0.25) * glassRim;
    finalColor = mix(finalColor, glassEdgeColor, glassRim * 0.7);
    finalColor *= insideDish; // Mask outside petri dish border

    fragColor = vec4(finalColor, 1.0) * qt_Opacity;
}
