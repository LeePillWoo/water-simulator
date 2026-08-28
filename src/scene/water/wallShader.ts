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
uniform float uTankWallHeight;
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

  float absorbFactor = clamp(depthBelow * uAbsorption, 0.0, 1.0);
  vec3 waterTint = mix(uShallowColor, uDeepColor, absorbFactor);

  // 진짜 굴절 대신, 깊이에 따라 색과 밝기를 살짝 흔들어 물이 일렁이는 느낌을 낸다.
  float shimmer = sin(vTankLocalPos.x * 18.0 + uTime * 1.6) * sin(vTankLocalPos.y * 22.0 - uTime * 1.1);
  waterTint += shimmer * 0.015;

  vec3 glassColor = mix(uGlassColor, uGlassColor * 1.3, fresnel);
  vec3 color = mix(glassColor, waterTint, wet * 0.85 + fresnel * 0.1);

  // 수면선 바로 위아래로 얇고 밝은 하이라이트 띠(메니스커스)를 얹는다.
  float waterline = 1.0 - smoothstep(0.0, 0.035, abs(depthBelow));
  color += vec3(waterline * 0.25);

  // 물리적으로 정확한 반사 대신, 유리에 붓으로 슥 그은 듯한 대각선 빛 하이라이트를
  // 고정된 위치에 얹는다 — 카메라 각도와 무관하게 항상 같은 자리에 보이는
  // "그림 같은" 유리 반사 느낌을 낸다.
  float heightFrac = clamp(vTankLocalPos.y / uTankWallHeight, 0.0, 1.0);
  float along = uv.x + uv.y;
  float diagonal = along * 0.5 + heightFrac * 0.85;
  float paintedHighlight = smoothstep(0.48, 0.6, diagonal) - smoothstep(0.64, 0.82, diagonal);
  color += vec3(1.0, 1.0, 0.97) * paintedHighlight * 0.4;

  float alpha = mix(uGlassOpacity, uWaterOpacity, wet);
  gl_FragColor = vec4(color, alpha);
}
`
