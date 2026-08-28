import * as THREE from 'three'

const SIZE = 512

/** 쇠공 과적으로 바닥이 깨졌을 때 띄우는 금 간 구멍 텍스처를 한 번만 그려서 캐싱한다. */
function drawFloorCrack(ctx: CanvasRenderingContext2D) {
  const cx = SIZE / 2
  const cy = SIZE / 2
  const holeR = SIZE * 0.09

  ctx.clearRect(0, 0, SIZE, SIZE)

  // 바닥이 뚫려 그 아래 어둠이 드러난 구멍(울퉁불퉁한 다각형).
  ctx.beginPath()
  const holePoints = 11
  for (let i = 0; i <= holePoints; i++) {
    const a = (i / holePoints) * Math.PI * 2
    const jitter = 0.65 + Math.sin(i * 2.7) * 0.22 + Math.cos(i * 1.3) * 0.15
    const r = holeR * jitter
    const x = cx + Math.cos(a) * r
    const y = cy + Math.sin(a) * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  const holeGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, holeR * 1.5)
  holeGrad.addColorStop(0, 'rgba(4,8,11,0.98)')
  holeGrad.addColorStop(1, 'rgba(4,8,11,0.7)')
  ctx.fillStyle = holeGrad
  ctx.fill()

  // 구멍 가장자리에서 사방으로 뻗어나가는 갈라진 금.
  const crackCount = 12
  ctx.strokeStyle = 'rgba(8,14,18,0.88)'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (let i = 0; i < crackCount; i++) {
    const baseAngle = (i / crackCount) * Math.PI * 2 + (i % 2 === 0 ? 0.14 : -0.11)
    let angle = baseAngle
    let x = cx + Math.cos(angle) * holeR * 0.85
    let y = cy + Math.sin(angle) * holeR * 0.85
    let len = SIZE * (0.16 + (i % 4) * 0.035)
    let width = 7 - (i % 3) * 1.4
    ctx.beginPath()
    ctx.moveTo(x, y)
    const segments = 3 + (i % 3)
    for (let s = 0; s < segments; s++) {
      angle += (((i * 37 + s * 53) % 17) - 8) * 0.045
      x += Math.cos(angle) * len
      y += Math.sin(angle) * len
      ctx.lineWidth = Math.max(0.6, width)
      ctx.lineTo(x, y)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x, y)
      len *= 0.72
      width *= 0.75
    }
  }

  // 구멍 주변에 흩어진 잔파편.
  ctx.fillStyle = 'rgba(8,14,18,0.5)'
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2 + 0.3
    const r = holeR * (1.15 + ((i * 13) % 10) * 0.13)
    const x = cx + Math.cos(a) * r
    const y = cy + Math.sin(a) * r
    const s = 1.4 + ((i * 7) % 5) * 0.6
    ctx.beginPath()
    ctx.arc(x, y, s, 0, Math.PI * 2)
    ctx.fill()
  }
}

let cached: THREE.CanvasTexture | null = null

export function getFloorCrackTexture(): THREE.CanvasTexture {
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  if (ctx) drawFloorCrack(ctx)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  cached = texture
  return texture
}
