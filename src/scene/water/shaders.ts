export const waterVertexShader = /* glsl */ `
attribute float overflow;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;
varying float vThickness;
varying float vOverflow;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  vThickness = position.y;
  vOverflow = overflow;
  gl_Position = projectionMatrix * mvPosition;
}
`

export const waterFragmentShader = /* glsl */ `
precision highp float;

uniform sampler2D tBackground;
uniform samplerCube uEnvMap;
uniform float uHasEnvMap;
uniform vec2 uResolution;
uniform vec3 uLightDirView;
uniform vec3 uShallowColor;
uniform vec3 uDeepColor;
uniform vec3 uSkyColor;
uniform float uAbsorption;
uniform float uFresnelPower;
uniform float uRefractionStrength;
uniform float uShoreFadeRange;
uniform float uTime;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;
varying float vThickness;
varying float vOverflow;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// 격자점 사이를 부드럽게 보간하는 값 노이즈. 스파클이 균일하게 흩뿌려지지 않고
// 뭉게구름처럼 뭉쳐 보이게 하는 저주파 마스크를 만드는 데 쓴다.
float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vViewPosition);

  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 refractedUV = clamp(uv + N.xy * uRefractionStrength, 0.0, 1.0);
  vec3 refracted = texture2D(tBackground, refractedUV).rgb;

  float fresnel = pow(1.0 - max(dot(N, V), 0.0), uFresnelPower);

  float absorbFactor = clamp(vThickness * uAbsorption, 0.0, 1.0);
  vec3 absorbed = mix(refracted, uDeepColor, absorbFactor);

  vec3 worldNormal = normalize(vWorldNormal);
  vec3 worldViewDir = normalize(cameraPosition - vWorldPosition);
  vec3 reflectDirWorld = reflect(-worldViewDir, worldNormal);

  vec3 skyReflectTint;
  if (uHasEnvMap > 0.5) {
    skyReflectTint = textureCube(uEnvMap, reflectDirWorld).rgb;
  } else {
    skyReflectTint = mix(uShallowColor, uSkyColor, reflectDirWorld.y * 0.5 + 0.5);
  }

  vec3 base = mix(absorbed, uSkyColor, fresnel * 0.45);
  vec3 color = mix(base, min(skyReflectTint, vec3(1.6)), fresnel * 0.4);

  float spec = pow(max(dot(reflect(-uLightDirView, N), V), 0.0), 70.0) * 0.5;
  color += vec3(1.0, 0.97, 0.9) * spec;

  // 햇빛 아래 물결이 일렁이며 반짝이는 윤슬. 딱딱한 점을 무작위로 켰다 끄는
  // 대신, 서로 다른 축척·방향으로 흘러가는 두 겹의 값 노이즈를 곱해 경계가
  // 부드러운 유기적인 반짝임 무늬를 만든다 — 물결을 따라 이어지는 결처럼
  // 보이도록. 저주파 노이즈로 큰 뭉게구름 같은 구역(클러스터)을 한 번 더
  // 씌워, 반짝임이 표면 전체가 아니라 자연스러운 무리로 나타나게 한다.
  vec2 clusterDrift = vec2(uTime * 0.05, uTime * 0.035);
  float cluster = valueNoise(vWorldPosition.xz * 1.8 + clusterDrift) * 0.6 + valueNoise(vWorldPosition.xz * 4.0 - clusterDrift * 1.7) * 0.4;
  cluster = smoothstep(0.4, 0.72, cluster);

  vec2 shimmerDriftA = vec2(uTime * 0.11, -uTime * 0.07);
  vec2 shimmerDriftB = vec2(-uTime * 0.08, uTime * 0.13);
  float shimmerA = valueNoise(vWorldPosition.xz * 14.0 + shimmerDriftA);
  float shimmerB = valueNoise(vWorldPosition.xz * 23.0 + shimmerDriftB);
  float shimmer = pow(clamp(shimmerA * shimmerB * 1.9 - 0.35, 0.0, 1.0), 2.5);

  float sparkleFalloff = pow(max(dot(reflect(-uLightDirView, N), V), 0.0), 5.0);
  color += vec3(1.0, 0.98, 0.9) * shimmer * cluster * sparkleFalloff * 2.8;

  // 벽 위로 넘친 지점은 흰 거품이 살짝 스치듯 밝아졌다 식는다.
  color += vec3(0.9, 0.95, 1.0) * vOverflow * 0.5;

  // 기울어진 수조의 얕은 쪽 바닥이 드러나도록, 수심이 거의 0에 가까운 곳은
  // 물이 얇은 막처럼 뜨 보이지 않게 투명도를 낮춰 바닥이 자연스럽게 비치게 한다.
  float wet = smoothstep(0.0, uShoreFadeRange, vThickness);
  gl_FragColor = vec4(color, wet);
}
`
