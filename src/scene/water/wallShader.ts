export const wallVertexShader = /* glsl */ `
uniform vec3 uMeshOffset;

varying vec3 vTankLocalPos;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;

void main() {
  vTankLocalPos = position + uMeshOffset;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const wallFragmentShader = /* glsl */ `
precision highp float;

uniform sampler2D uHeightMap;
uniform float uRestDepth;
uniform float uTankWidth;
uniform float uTankDepth;
uniform vec3 uGlassColor;
uniform vec3 uShallowColor;
uniform vec3 uDeepColor;
uniform float uGlassOpacity;
uniform float uWaterOpacity;
uniform float uAbsorption;
uniform float uTime;

varying vec3 vTankLocalPos;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;

void main() {
  vec2 uv = clamp(
    vec2((vTankLocalPos.x + uTankWidth * 0.5) / uTankWidth, (vTankLocalPos.z + uTankDepth * 0.5) / uTankDepth),
    0.0,
    1.0
  );
  float h = texture2D(uHeightMap, uv).r;
  float waterY = uRestDepth + h;
  float depthBelow = waterY - vTankLocalPos.y;

  // 수면선 근처를 살짝 흐릿하게 걸쳐 부드러운 젖음 경계를 만든다.
  float wet = smoothstep(-0.01, 0.02, depthBelow);

  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float fresnel = pow(1.0 - max(dot(normalize(vWorldNormal), viewDir), 0.0), 2.5);

  // 톤 셰이딩: 부드러운 그라디언트 대신 3단계로 뚝뚝 끊어 물빛을 표현한다.
  // 가장 가까운 단계로 반올림해 옅은 수심에서도 색이 사라지지 않게 한다.
  float absorbFactor = clamp(depthBelow * uAbsorption, 0.0, 1.0);
  float bandedAbsorb = floor(absorbFactor * 3.0 + 0.5) / 2.0;
  vec3 waterTint = mix(uShallowColor, uDeepColor, bandedAbsorb);

  // 진짜 굴절 대신, 깊이에 따라 색과 밝기를 살짝 흔들어 물이 일렁이는 느낌을 낸다.
  float shimmer = sin(vTankLocalPos.x * 18.0 + uTime * 1.6) * sin(vTankLocalPos.y * 22.0 - uTime * 1.1);
  waterTint += shimmer * 0.015;

  vec3 glassColor = mix(uGlassColor, uGlassColor * 1.3, fresnel);
  vec3 color = mix(glassColor, waterTint, wet * 0.85 + fresnel * 0.1);

  // 수면선 바로 위아래로 얇고 밝은 하이라이트 띠(메니스커스)를 얹는다.
  float waterline = 1.0 - smoothstep(0.0, 0.035, abs(depthBelow));
  color += vec3(waterline * 0.25);

  float alpha = mix(uGlassOpacity, uWaterOpacity, wet);
  gl_FragColor = vec4(color, alpha);
}
`
