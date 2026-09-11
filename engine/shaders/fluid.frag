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
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 4; ++i) {
        v += a * noise2D(p);
        p = rot * p * 2.02 + vec2(1.3, 0.7);
        a *= 0.5;
    }
    return v;
}

// Incompressible Divergence-Free Curl Noise: u = (dPsi/dy, -dPsi/dx)
vec2 curlNoise(vec2 p, float t) {
    const float eps = 0.02;
    float n1 = fbm(p + vec2(0.0, eps) + t * 0.15);
    float n2 = fbm(p - vec2(0.0, eps) + t * 0.15);
    float n3 = fbm(p + vec2(eps, 0.0) + t * 0.15);
    float n4 = fbm(p - vec2(eps, 0.0) + t * 0.15);

    float dPsi_dy = (n1 - n2) / (2.0 * eps);
    float dPsi_dx = (n3 - n4) / (2.0 * eps);

    return vec2(dPsi_dy, -dPsi_dx);
}

void main() {
    // 1. Aspect Ratio Normalization
    vec2 aspect = vec2(u_resolution.x / max(u_resolution.y, 1.0), 1.0);
    vec2 uv = (qt_TexCoord0 - 0.5) * aspect;
    vec2 pointer = (u_pointer - 0.5) * aspect;
    vec2 keyPos = (u_keystroke_pos - 0.5) * aspect;
    vec2 beatCenter = (u_beat_center - 0.5) * aspect;

    // 2. Base Fluid Velocity Field (Curl Noise + Organic Steering Drift)
    float timeScaled = u_time * 0.35 * u_vortex_speed;
    vec2 velocity = curlNoise(uv * 2.2, timeScaled);

    // Apply user-steered and slow autonomous oceanic drift (removes fixed top-left bias)
    velocity += u_ambient_drift * 0.8;

    // 3. Pointer Vortex Stirring with Persistent Inertia
    vec2 toPointer = uv - pointer;
    float distPointer = length(toPointer);
    
    // Tangential vortex velocity (swirl paddle with core radius)
    vec2 vortexTangential = vec2(-toPointer.y, toPointer.x) / (distPointer * distPointer + 0.035);
    velocity += vortexTangential * 0.35 * u_vortex_speed;
    
    // Persistent kinetic momentum injected by cursor dragging
    float pointerInfluence = exp(-distPointer * 5.5);
    velocity += u_pointer_vel * pointerInfluence * 2.0;

    // 4. Directional Keystroke Push & Dye Splash
    if (u_keystroke_energy > 0.01) {
        vec2 toKey = uv - keyPos;
        float distKey = length(toKey);
        float keyInfluence = exp(-distKey * 6.0) * u_keystroke_energy;

        // Push fluid along the letter's directional impulse vector
        velocity += u_keystroke_dir * keyInfluence * 3.0;

        // Micro-shear swirl at the keystroke epicenter
        vec2 keySwirl = vec2(-toKey.y, toKey.x) / (distKey * distKey + 0.02);
        velocity += keySwirl * keyInfluence * 0.6;
    }

    // 5. Audio-Driven Injections from Wandering Epicenter
    vec2 toBeat = uv - beatCenter;
    float distBeat = length(toBeat);
    vec2 outwardBeat = normalize(toBeat + vec2(0.0001));
    
    // Pulsing acoustic shockfront from wandering epicenter (drives fluid outward)
    velocity += outwardBeat * u_bass * exp(-distBeat * 3.2) * 2.4;

    // Boundary jets firing inward on heavy bass/hits
    float edgeDist = min(min(qt_TexCoord0.x, 1.0 - qt_TexCoord0.x), min(qt_TexCoord0.y, 1.0 - qt_TexCoord0.y));
    vec2 inwardDir = -normalize(uv);
    velocity += inwardDir * u_bass * exp(-edgeDist * 6.5) * 1.5;

    // Treble micro-turbulence
    velocity += curlNoise(uv * 7.5, u_time * 1.2) * u_treble * 0.75;

    // 6. Authentication Failure Cavitation Shockwave
    if (u_shockwave_intensity > 0.01) {
        float centerDist = length(uv);
        float shockwaveRadius = (1.0 - u_shockwave_intensity) * 1.6;
        float shockFront = exp(-pow((centerDist - shockwaveRadius) * 12.0, 2.0));
        
        // Violent outward radial blast
        velocity += normalize(uv) * shockFront * 3.5;
    }

    // 7. Advection: Sample Dye Tracers along Physical Velocity Streamlines
    vec2 advectedUV = qt_TexCoord0 + velocity * 0.045;
    float d1 = fbm(advectedUV * 3.2 + u_ambient_drift * 0.6);
    float d2 = fbm(advectedUV * 4.8 - u_ambient_drift * 0.4);
    float d3 = noise2D(advectedUV * 8.0 + vec2(u_time * 0.15));

    // Dynamic Color Blending from Palette Uniforms
    vec3 color = u_color_bg;
    float w1 = smoothstep(0.08, 0.65, d1 + u_bass * 0.40);
    float w2 = smoothstep(0.15, 0.75, d2 + u_mids * 0.35);
    float w3 = smoothstep(0.20, 0.85, d3 + u_treble * 0.30);

    color = mix(color, u_color_dye1, w1 * 0.75);
    color = mix(color, u_color_dye2, w2 * 0.65);
    color = mix(color, u_color_dye3, w3 * 0.55);

    // Beat epicenter acoustic luminescence burst
    float beatGlow = exp(-distBeat * 7.5) * u_bass * 2.2;
    color += mix(u_color_dye1, u_color_dye2, 0.5) * beatGlow;

    // 9. Directional Keystroke Dye Splat Rendering
    if (u_keystroke_energy > 0.01) {
        float splatDist = length(uv - keyPos);
        float splatWave = sin(splatDist * 22.0 - u_time * 10.0) * 0.5 + 0.5;
        float splatFalloff = exp(-splatDist * 6.5);
        float splatIntensity = splatFalloff * u_keystroke_energy;

        vec3 keyDye = mix(u_color_dye2, u_color_dye3, splatWave);
        color += keyDye * splatIntensity * 1.75;
    }

    // 10. Cavitation Detonation Shockwave Flash (Auth Failed)
    if (u_shockwave_intensity > 0.01) {
        float centerDist = length(uv);
        float shockRadius = (1.0 - u_shockwave_intensity) * 1.6;
        float ring = exp(-pow((centerDist - shockRadius) * 10.0, 2.0));

        vec3 crimsonShock = vec3(1.0, 0.08, 0.16);
        vec3 shockColor = mix(crimsonShock, vec3(1.0, 0.95, 0.85), ring * 0.6);
        color = mix(color, shockColor, (ring + 0.35 * exp(-centerDist * 2.0)) * u_shockwave_intensity);
    }

    // 11. Normal Vector & Blinn-Phong Specular Highlight
    vec2 eps = vec2(0.005, 0.0);
    float nL = fbm(advectedUV - eps.xy);
    float nR = fbm(advectedUV + eps.xy);
    float nD = fbm(advectedUV - eps.yx);
    float nU = fbm(advectedUV + eps.yx);
    vec3 normal = normalize(vec3(nL - nR, nD - nU, 0.35));

    vec3 lightDir = normalize(vec3(0.35, 0.5, 0.8));
    float specular = pow(max(dot(reflect(-lightDir, normal), vec3(0.0, 0.0, 1.0)), 0.0), 16.0);
    color += vec3(0.85, 0.95, 1.0) * specular * 0.45;

    // 12. Tone Mapping, Vignette & Output
    float vignette = smoothstep(1.25, 0.35, length(uv));
    color *= vignette;

    fragColor = vec4(color, 1.0) * qt_Opacity;
}
