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

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;
varying float vThickness;
varying float vOverflow;

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
  vec3 color = mix(base, skyReflectTint, fresnel * 0.5);

  float spec = pow(max(dot(reflect(-uLightDirView, N), V), 0.0), 64.0) * 0.4;
  color += vec3(spec);

  // 벽 위로 넘친 지점은 흰 거품이 살짝 스치듯 밝아졌다 식는다.
  color += vec3(0.9, 0.95, 1.0) * vOverflow * 0.5;

  // 기울어진 수조의 얕은 쪽 바닥이 드러나도록, 수심이 거의 0에 가까운 곳은
  // 물이 얇은 막처럼 뜨 보이지 않게 투명도를 낮춰 바닥이 자연스럽게 비치게 한다.
  float wet = smoothstep(0.0, uShoreFadeRange, vThickness);
  gl_FragColor = vec4(color, wet);
}
`
