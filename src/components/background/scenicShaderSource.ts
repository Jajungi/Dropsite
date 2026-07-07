/** Procedural mountain / sky / water — adapted for faint ambient background */
export const VERTEX_SHADER = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

export const FRAGMENT_SHADER = `
  precision highp float;
  uniform vec2 u_resolution;
  uniform float u_time;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p *= 2.1;
      a *= 0.5;
    }
    return v;
  }

  float mountainLayer(vec2 st, float height, float scale, float speed) {
    float ridge = fbm(vec2(st.x * scale + u_time * speed, 0.0));
    return smoothstep(height + ridge * 0.18, height + ridge * 0.18 + 0.02, st.y);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec2 st = vec2(uv.x, 1.0 - uv.y);
    st.x *= u_resolution.x / u_resolution.y;

    float dayness = 0.82;
    float sunriseSet = smoothstep(0.0, 0.22, st.y) * (1.0 - smoothstep(0.22, 0.42, st.y));

    vec3 skyTop = mix(vec3(0.12, 0.16, 0.28), vec3(0.52, 0.72, 0.92), dayness);
    vec3 skyHorizon = mix(vec3(0.35, 0.28, 0.42), vec3(0.98, 0.88, 0.72), dayness);
    vec3 skyBase = mix(skyHorizon, skyTop, smoothstep(0.0, 0.7, st.y));
    skyBase += vec3(1.0, 0.55, 0.25) * sunriseSet * 0.25;

    float inC = mountainLayer(st, 0.18, 1.6, 0.008);
    float inB = mountainLayer(st, 0.28, 2.2, 0.012);
    float inA = mountainLayer(st, 0.38, 3.0, 0.018);

    vec3 colA = mix(vec3(0.18, 0.24, 0.34), vec3(0.45, 0.55, 0.68), dayness);
    vec3 colB = mix(vec3(0.14, 0.19, 0.28), vec3(0.38, 0.48, 0.62), dayness);
    vec3 colC = mix(vec3(0.10, 0.14, 0.22), vec3(0.30, 0.40, 0.55), dayness);

    vec3 col = skyBase;
    col = mix(col, colC, inC * 0.85);
    col = mix(col, colB, inB * 0.75);
    col = mix(col, colA, inA * 0.65);

    float l = 0.0;
    for (float i = 0.0; i < 6.0; i++) {
      float wave = sin(st.x * 8.0 + u_time * 0.35 + i) * 0.012;
      float dist = abs(st.y + wave - i * 0.1);
      l += 0.015 / (dist + 0.08);
    }

    vec3 waterBase = mix(skyBase * 0.6, vec3(0.08, 0.79, 0.65), sunriseSet + dayness * 0.3);
    vec3 waterLines = mix(vec3(0.27, 0.45, 0.64), vec3(1.0, 0.85, 0.5), dayness);
    vec3 waterCol = waterBase + waterLines * l * 0.35;
    float waterMask = smoothstep(0.0, 0.3, l) * smoothstep(0.55, 0.2, st.y);

    col = mix(col, waterCol, waterMask);

    float vignette = smoothstep(1.2, 0.2, length(st - vec2(0.0, 0.3)));
    col *= 0.92 + vignette * 0.08;

    gl_FragColor = vec4(col, 1.0);
  }
`;
