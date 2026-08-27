import * as THREE from 'three'
import type { BallSpec } from '../store/useSimStore'
import type { ToyPart } from './toyTypes'
import { TOY_DEFS } from './toyTypes'

export interface BallWetUniforms {
  uWaterY: { value: number }
  uBallCenter: { value: THREE.Vector3 }
}

interface BodyMaterialEntry {
  material: THREE.MeshStandardMaterial
  uniforms: BallWetUniforms
}

const WET_TINT = new THREE.Color('#1f5a7a')
const bodyMaterials = new Map<number, BodyMaterialEntry>()
const decorMaterials = new Map<string, THREE.MeshStandardMaterial>()

/**
 * 몸통(parts[0])에 젖음 셰이딩을 입힌다: 물에 잠긴 부분만 물색으로 물들이고
 * 광택을 올리며, 수면과 만나는 경계에는 밝은 젖음 하이라이트(메니스커스)를
 * 얹는다. onBeforeCompile로 MeshStandardMaterial의 기본 조명/그림자를 그대로
 * 살린 채 color/roughness 계산 단계에만 끼워 넣는다.
 */
function createBodyMaterial(part: ToyPart): BodyMaterialEntry {
  const uniforms: BallWetUniforms = {
    uWaterY: { value: -1000 },
    uBallCenter: { value: new THREE.Vector3() },
  }

  const material = new THREE.MeshStandardMaterial({
    color: part.color,
    roughness: part.roughness,
    metalness: part.metalness,
  })
  // onBeforeCompile로 끼워 넣은 코드가 있는 셰이더는, 표준 defines가 우연히 같은
  // 다른 MeshStandardMaterial(바닥 등)과 컴파일된 프로그램을 공유하지 않도록
  // 캐시 키를 따로 지정해야 한다. 안 그러면 커스텀 코드가 조용히 무시될 수 있다.
  material.customProgramCacheKey = () => 'ball-wet-shader'

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWaterY = uniforms.uWaterY
    shader.uniforms.uBallCenter = uniforms.uBallCenter
    shader.uniforms.uWetTint = { value: WET_TINT }
    shader.uniforms.uPartScale = { value: new THREE.Vector3(...part.scale) }
    shader.uniforms.uPartOffset = { value: new THREE.Vector3(...part.position) }

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform vec3 uBallCenter;\nuniform vec3 uPartScale;\nuniform vec3 uPartOffset;\nvarying vec3 vTankLocalPos;',
      )
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvTankLocalPos = position * uPartScale + uPartOffset + uBallCenter;',
      )

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform float uWaterY;\nuniform vec3 uWetTint;\nvarying vec3 vTankLocalPos;',
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        {
          // 잠긴 부분은 물색으로 짙게 물들여, 위쪽 마른 부분과 뚜렷이 구분되게 한다.
          float depthBelow = uWaterY - vTankLocalPos.y;
          float wet = smoothstep(-0.02, 0.02, depthBelow);
          diffuseColor.rgb = mix(diffuseColor.rgb, uWetTint, wet * 0.8);
        }`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        {
          // 젖은 표면은 매끈해져 하이라이트가 더 또렷해진다.
          float depthBelow2 = uWaterY - vTankLocalPos.y;
          float wet2 = smoothstep(-0.02, 0.02, depthBelow2);
          roughnessFactor = mix(roughnessFactor, roughnessFactor * 0.25, wet2);
        }`,
      )
      .replace(
        '#include <opaque_fragment>',
        `#include <opaque_fragment>
        {
          // 조명 계산과 무관하게 항상 보이는 밝은 젖음 경계선(메니스커스)을
          // 수면 접촉 지점에 얇게 덧그린다.
          float depthBelow3 = uWaterY - vTankLocalPos.y;
          float rim = 1.0 - smoothstep(0.0, 0.028, abs(depthBelow3));
          gl_FragColor.rgb += vec3(0.85, 0.92, 1.0) * rim * 0.55;
        }`,
      )
  }

  return { material, uniforms }
}

function getDecorMaterial(type: string, partIndex: number, part: ToyPart) {
  const key = `${type}-${partIndex}`
  const existing = decorMaterials.get(key)
  if (existing) return existing
  const material = new THREE.MeshStandardMaterial({
    color: part.color,
    roughness: part.roughness,
    metalness: part.metalness,
  })
  decorMaterials.set(key, material)
  return material
}

/** 이 공(id)의 부품별 재질 배열을 반환한다. parts[0]은 매 프레임 갱신이 필요한 전용 젖음 재질,
 * 나머지는 같은 타입의 모든 공이 공유하는 정적 재질이다. */
export function getOrCreateBallMaterials(spec: BallSpec): { materials: THREE.MeshStandardMaterial[]; bodyUniforms: BallWetUniforms } {
  const def = TOY_DEFS[spec.type]
  let bodyEntry = bodyMaterials.get(spec.id)
  if (!bodyEntry) {
    bodyEntry = createBodyMaterial(def.parts[0])
    bodyMaterials.set(spec.id, bodyEntry)
  }
  const materials = [bodyEntry.material]
  for (let i = 1; i < def.parts.length; i++) {
    materials.push(getDecorMaterial(spec.type, i, def.parts[i]))
  }
  return { materials, bodyUniforms: bodyEntry.uniforms }
}

/** 더 이상 존재하지 않는 공의 몸통 재질을 정리한다 (물체 지우기/리셋 시 누수 방지). 부품 공용 재질은 계속 재사용한다. */
export function pruneBallMaterials(idsToKeep: Set<number>) {
  for (const [id, entry] of bodyMaterials) {
    if (!idsToKeep.has(id)) {
      entry.material.dispose()
      bodyMaterials.delete(id)
    }
  }
}

export function disposeAllBallMaterials() {
  for (const entry of bodyMaterials.values()) entry.material.dispose()
  bodyMaterials.clear()
}
