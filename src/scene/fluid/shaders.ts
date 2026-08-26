// Screen-Space Fluid Rendering용 셰이더 모음.
// 파티클을 구체 그대로 렌더링하되, view-space 깊이/두께만 별도 버퍼에 뽑아내고
// 블러 + 노멀 재구성 + 굴절/반사 합성으로 하나로 이어진 물 표면처럼 보이게 만든다.

export const depthVertexShader = /* glsl */ `
#include <common>

varying vec3 vViewPosition;

void main() {
  vec4 mvPosition = vec4(position, 1.0);
  #ifdef USE_INSTANCING
    mvPosition = instanceMatrix * mvPosition;
  #endif
  mvPosition = modelViewMatrix * mvPosition;
  vViewPosition = mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`

export const depthFragmentShader = /* glsl */ `
varying vec3 vViewPosition;

void main() {
  float dist = -vViewPosition.z;
  gl_FragColor = vec4(dist, 1.0, 0.0, 1.0);
}
`

export const thicknessVertexShader = /* glsl */ `
#include <common>

varying vec3 vViewPosition;
varying vec3 vNormalView;

void main() {
  vec4 mvPosition = vec4(position, 1.0);
  vec3 n = normal;
  #ifdef USE_INSTANCING
    mvPosition = instanceMatrix * mvPosition;
    mat3 m = mat3(instanceMatrix);
    n = m * n;
  #endif
  mvPosition = modelViewMatrix * mvPosition;
  vViewPosition = mvPosition.xyz;
  vNormalView = normalize(normalMatrix * n);
  gl_Position = projectionMatrix * mvPosition;
}
`

export const thicknessFragmentShader = /* glsl */ `
uniform float uThicknessScale;
varying vec3 vViewPosition;
varying vec3 vNormalView;

void main() {
  vec3 viewDir = normalize(-vViewPosition);
  float ndv = max(dot(normalize(vNormalView), viewDir), 0.2);
  gl_FragColor = vec4(uThicknessScale * ndv, 0.0, 0.0, 1.0);
}
`

export const fullscreenVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

export const blurFragmentShader = /* glsl */ `
uniform sampler2D tInput;
uniform vec2 uTexelSize;
uniform vec2 uDirection;
uniform float uDepthSigma;
varying vec2 vUv;

// spatialW = exp(-i*i/45.0) depends only on the fixed kernel-radius loop
// index, never on per-pixel data, so precompute it as constants instead of
// calling exp() every pixel/pass for a value the compiler otherwise
// recomputes at runtime. R stays 9 to match the loop bound below; if R ever
// changes, this table (and the trailing return) must be extended to match.
float spatialWeight(int i) {
  if (i == 1) return 0.978023;
  if (i == 2) return 0.914947;
  if (i == 3) return 0.818731;
  if (i == 4) return 0.700783;
  if (i == 5) return 0.573754;
  if (i == 6) return 0.449329;
  if (i == 7) return 0.336592;
  if (i == 8) return 0.241178;
  return 0.165299; // i == 9
}

void main() {
  vec4 center = texture2D(tInput, vUv);
  if (center.a < 0.5) {
    gl_FragColor = vec4(0.0);
    return;
  }
  float centerDepth = center.r;
  float sum = centerDepth;
  float sumW = 1.0;
  const int R = 9;
  for (int i = 1; i <= R; i++) {
    vec2 off = uDirection * uTexelSize * float(i);
    float spatialW = spatialWeight(i);

    vec4 sN = texture2D(tInput, vUv + off);
    if (sN.a > 0.5) {
      float dd = sN.r - centerDepth;
      float w = spatialW * exp(-(dd * dd) / uDepthSigma);
      sum += sN.r * w;
      sumW += w;
    }
    vec4 sP = texture2D(tInput, vUv - off);
    if (sP.a > 0.5) {
      float dd = sP.r - centerDepth;
      float w = spatialW * exp(-(dd * dd) / uDepthSigma);
      sum += sP.r * w;
      sumW += w;
    }
  }
  gl_FragColor = vec4(sum / sumW, 1.0, 0.0, 1.0);
}
`

export const compositeFragmentShader = /* glsl */ `
uniform sampler2D tBackground;
uniform sampler2D tBackgroundDepth;
uniform sampler2D tDepth;
uniform sampler2D tThickness;
uniform vec2 uTexelSize;
uniform float uCameraNear;
uniform float uCameraFar;
uniform vec2 uTanHalfFov;
uniform vec3 uLightDirView;
uniform vec3 uShallowColor;
uniform vec3 uDeepColor;
uniform float uAbsorption;
uniform float uFresnelPower;
uniform float uRefractionStrength;
uniform float uOcclusionBias;
varying vec2 vUv;

float linearizeDepth(float d) {
  float z = d * 2.0 - 1.0;
  return (2.0 * uCameraNear * uCameraFar) / (uCameraFar + uCameraNear - z * (uCameraFar - uCameraNear));
}

vec3 reconstructViewPos(vec2 uv, float dist) {
  vec2 ndc = uv * 2.0 - 1.0;
  return vec3(ndc.x * dist * uTanHalfFov.x, ndc.y * dist * uTanHalfFov.y, -dist);
}

void main() {
  vec4 bg = texture2D(tBackground, vUv);
  vec4 d = texture2D(tDepth, vUv);
  if (d.a < 0.5) {
    gl_FragColor = bg;
    return;
  }

  float waterDist = d.r;

  float bgDepthRaw = texture2D(tBackgroundDepth, vUv).r;
  float bgDist = linearizeDepth(bgDepthRaw);
  if (bgDist < waterDist - uOcclusionBias) {
    gl_FragColor = bg;
    return;
  }

  vec3 viewPos = reconstructViewPos(vUv, waterDist);

  vec2 e = uTexelSize;
  float dR = texture2D(tDepth, vUv + vec2(e.x, 0.0)).r;
  float dL = texture2D(tDepth, vUv - vec2(e.x, 0.0)).r;
  float dU = texture2D(tDepth, vUv + vec2(0.0, e.y)).r;
  float dD = texture2D(tDepth, vUv - vec2(0.0, e.y)).r;
  vec3 pR = reconstructViewPos(vUv + vec2(e.x, 0.0), dR);
  vec3 pL = reconstructViewPos(vUv - vec2(e.x, 0.0), dL);
  vec3 pU = reconstructViewPos(vUv + vec2(0.0, e.y), dU);
  vec3 pD = reconstructViewPos(vUv - vec2(0.0, e.y), dD);
  vec3 normal = normalize(cross(pR - pL, pU - pD));
  if (normal.z < 0.0) normal = -normal;

  vec3 viewDir = normalize(-viewPos);
  float fresnel = pow(1.0 - clamp(dot(normal, viewDir), 0.0, 1.0), uFresnelPower);

  float thickness = texture2D(tThickness, vUv).r;

  vec2 refractUv = clamp(vUv + normal.xy * uRefractionStrength, vec2(0.001), vec2(0.999));
  vec3 refracted = texture2D(tBackground, refractUv).rgb;
  vec3 absorbed = mix(refracted, uDeepColor, clamp(thickness * uAbsorption, 0.0, 1.0));

  vec3 reflectDir = reflect(-viewDir, normal);
  vec3 skyColor = mix(uShallowColor, vec3(0.55, 0.78, 0.92), clamp(reflectDir.y * 0.5 + 0.5, 0.0, 1.0));

  vec3 baseColor = mix(absorbed, skyColor, fresnel * 0.45);

  float spec = pow(max(dot(reflect(-uLightDirView, normal), viewDir), 0.0), 64.0);
  baseColor += vec3(1.0) * spec * 0.4;

  float alpha = smoothstep(0.0, 0.35, thickness);
  gl_FragColor = vec4(mix(bg.rgb, baseColor, alpha), 1.0);
}
`
