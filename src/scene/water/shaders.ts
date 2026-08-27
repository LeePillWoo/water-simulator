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

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vViewPosition);

  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 refractedUV = clamp(uv + N.xy * uRefractionStrength, 0.0, 1.0);
  vec3 refracted = texture2D(tBackground, refractedUV).rgb;

  float fresnel = pow(1.0 - max(dot(N, V), 0.0), uFresnelPower);

  // 톤 셰이딩: 수심에 따른 색을 부드러운 그라디언트 대신 4단계로 뚝뚝 끊어
  // 만화 같은 얕은물/깊은물 색 구역이 보이게 한다. floor()로 그냥 끊으면 실제
  // 수조 수심대에서 값이 죄다 가장 낮은 단계(0)로 뭉개져 파란기가 사라지므로,
  // 가장 가까운 단계로 반올림한다.
  float absorbFactor = clamp(vThickness * uAbsorption, 0.0, 1.0);
  float bandedAbsorb = floor(absorbFactor * 4.0 + 0.5) / 3.0;
  vec3 absorbed = mix(refracted, uDeepColor, bandedAbsorb);

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

  float spec = pow(max(dot(reflect(-uLightDirView, N), V), 0.0), 180.0) * 0.45;
  color += vec3(1.0, 0.97, 0.9) * spec;

  // 햇빛 아래 물결이 반짝이는 잔별 같은 스파클: 표면을 잘게 쪼갠 셀마다 무작위로
  // 반짝였다 꺼지게 하고, 실제 빛 반사 방향과 가까운 곳에서만 밝게 보이도록
  // 스펙큘러 강도로 한 번 더 눌러준다(전체 표면에 고르게 뿌려지지 않게).
  vec2 sparkleCell = floor(vWorldPosition.xz * 55.0 + hash21(floor(vWorldPosition.xz * 3.0)) * 10.0);
  float sparkleFlicker = hash21(sparkleCell + floor(uTime * 6.0));
  float sparkleOn = step(0.985, hash21(sparkleCell)) * step(0.5, sparkleFlicker);
  float sparkleFalloff = pow(max(dot(reflect(-uLightDirView, N), V), 0.0), 6.0);
  color += vec3(1.0, 0.98, 0.92) * sparkleOn * sparkleFalloff * 1.8;

  // 벽 위로 넘친 지점은 흰 거품이 살짝 스치듯 밝아졌다 식는다.
  color += vec3(0.9, 0.95, 1.0) * vOverflow * 0.5;

  // 기울어진 수조의 얕은 쪽 바닥이 드러나도록, 수심이 거의 0에 가까운 곳은
  // 물이 얇은 막처럼 뜨 보이지 않게 투명도를 낮춰 바닥이 자연스럽게 비치게 한다.
  float wet = smoothstep(0.0, uShoreFadeRange, vThickness);
  gl_FragColor = vec4(color, wet);
}
`
