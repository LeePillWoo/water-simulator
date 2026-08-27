export const waterVertexShader = /* glsl */ `
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;
varying float vThickness;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  vThickness = position.y;
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

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;
varying float vThickness;

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

  gl_FragColor = vec4(color, 1.0);
}
`
