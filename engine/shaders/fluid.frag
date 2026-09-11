#version 440

layout(location = 0) in vec2 qt_TexCoord0;
layout(location = 0) out vec4 fragColor;

layout(std140, binding = 0) uniform buf {
    mat4 qt_Matrix;
    float qt_Opacity;
    vec2 u_resolution;
    vec2 u_pointer;
    vec2 u_pointer_vel;
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

// Fractal Brownian Motion (fBm)
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

    // 2. Base Fluid Velocity Field (Curl Noise + Thermal Convection)
    float timeScaled = u_time * 0.4 * u_vortex_speed;
    vec2 velocity = curlNoise(uv * 2.5, timeScaled);

    // 3. Pointer Vortex Injection & Linear Momentum
    vec2 toPointer = uv - pointer;
    float distPointer = length(toPointer);
    
    // Tangential vortex velocity (swirl paddle)
    vec2 vortexTangential = vec2(-toPointer.y, toPointer.x) / (distPointer * distPointer + 0.04);
    velocity += vortexTangential * 0.35 * u_vortex_speed;
    
    // Linear drag from cursor speed
    velocity += u_pointer_vel * exp(-distPointer * 6.0) * 1.5;

    // 4. Audio-Driven Velocity Injections (PipeWire Bass & Mids)
    // Boundary jets firing inward on beat
    float edgeDist = min(min(qt_TexCoord0.x, 1.0 - qt_TexCoord0.x), min(qt_TexCoord0.y, 1.0 - qt_TexCoord0.y));
    vec2 inwardDir = -normalize(uv);
    velocity += inwardDir * u_bass * exp(-edgeDist * 8.0) * 1.2;

    // Treble micro-turbulence
    velocity += curlNoise(uv * 8.0, u_time * 1.5) * u_treble * 0.4;

    // 5. Authentication Failure Cavitation Shockwave
    if (u_shockwave_intensity > 0.01) {
        float centerDist = length(uv);
        float shockwaveRadius = (1.0 - u_shockwave_intensity) * 1.6;
        float shockFront = exp(-pow((centerDist - shockwaveRadius) * 12.0, 2.0));
        
        // Violent outward radial displacement
        vec2 radialBlast = normalize(uv) * shockFront * u_shockwave_intensity * 2.5;
        velocity += radialBlast;
    }

    // 6. Semi-Lagrangian Coordinate Advection (Multi-Step)
    float dt = 0.035;
    vec2 advectedUV = uv;
    advectedUV -= velocity * dt;
    advectedUV -= curlNoise(advectedUV * 3.0, timeScaled * 1.2) * (dt * 0.5);

    // 7. Radiant Dye Density & Color Channel Synthesis
    float d1 = fbm(advectedUV * 3.2 + vec2(0.5, 0.2));
    float d2 = fbm(advectedUV * 4.5 - vec2(0.3, 0.7));
    float d3 = fbm(advectedUV * 6.0 + vec2(0.8, -0.4));

    // Dynamic dye palettes
    vec3 cyanDye    = vec3(0.0, 0.85, 1.0);
    vec3 magentaDye = vec3(1.0, 0.05, 0.65);
    vec3 amberDye   = vec3(1.0, 0.75, 0.15);
    vec3 crimsonDye = vec3(1.0, 0.08, 0.18);
    vec3 obsidianBg = vec3(0.02, 0.03, 0.06);

    // Baseline swirling dye composite
    vec3 color = obsidianBg;
    float cyanWeight = smoothstep(0.1, 0.7, d1 + u_bass * 0.3);
    float magentaWeight = smoothstep(0.2, 0.8, d2 + u_mids * 0.3);
    float amberWeight = smoothstep(0.3, 0.9, d3 + u_treble * 0.2);

    color = mix(color, cyanDye, cyanWeight * 0.7);
    color = mix(color, magentaDye, magentaWeight * 0.6);
    color = mix(color, amberDye, amberWeight * 0.5);

    // 8. Keystroke Energy Splat (Typing Injection)
    if (u_keystroke_energy > 0.01) {
        float splatDist = length(uv - pointer);
        float splatWave = sin(splatDist * 25.0 - u_time * 12.0) * 0.5 + 0.5;
        float splatFalloff = exp(-splatDist * 7.0);
        float splatIntensity = splatFalloff * u_keystroke_energy;

        vec3 typingDye = mix(magentaDye, amberDye, splatWave);
        color += typingDye * splatIntensity * 1.8;
    }

    // 9. Cavitation Detonation Flash (Auth Failed)
    if (u_shockwave_intensity > 0.01) {
        float centerDist = length(uv);
        float shockRadius = (1.0 - u_shockwave_intensity) * 1.6;
        float ring = exp(-pow((centerDist - shockRadius) * 10.0, 2.0));

        // Crimson shock flash with hot white core
        vec3 shockColor = mix(crimsonDye, vec3(1.0, 0.9, 0.8), ring * 0.6);
        color = mix(color, shockColor, (ring + 0.3 * exp(-centerDist * 2.0)) * u_shockwave_intensity);
    }

    // 10. Normal Vector Estimation & Specular Shading
    vec2 eps = vec2(0.005, 0.0);
    float nL = fbm(advectedUV - eps.xy);
    float nR = fbm(advectedUV + eps.xy);
    float nD = fbm(advectedUV - eps.yx);
    float nU = fbm(advectedUV + eps.yx);
    vec3 normal = normalize(vec3(nL - nR, nD - nU, 0.35));

    // Specular highlight from light source
    vec3 lightDir = normalize(vec3(0.3, 0.5, 0.8));
    float specular = pow(max(dot(reflect(-lightDir, normal), vec3(0.0, 0.0, 1.0)), 0.0), 16.0);
    color += vec3(0.8, 0.95, 1.0) * specular * 0.45;

    // 11. Tone Mapping, Vignette & Output
    float vignette = smoothstep(1.2, 0.3, length(uv));
    color *= vignette;

    fragColor = vec4(color, 1.0) * qt_Opacity;
}
