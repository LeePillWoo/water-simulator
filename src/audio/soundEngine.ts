// 외부 오디오 파일 없이 Web Audio API로 직접 합성한 효과음.
// 오토플레이 정책 때문에 AudioContext는 사용자 제스처(버튼 클릭) 이후에만 생성/재개한다.

let ctx: AudioContext | null = null
const noiseBufferCache = new Map<number, AudioBuffer>()

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!ctx) ctx = new Ctor()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function getNoiseBuffer(c: AudioContext, seconds: number) {
  const key = Math.round(seconds * 1000)
  const cached = noiseBufferCache.get(key)
  if (cached) return cached
  const length = Math.max(1, Math.floor(c.sampleRate * seconds))
  const buffer = c.createBuffer(1, length, c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
  noiseBufferCache.set(key, buffer)
  return buffer
}

/** 물체가 물에 부딪히는 소리. intensity(0~1)가 클수록 낮고 크고 길게 "퐁덩", 작을수록 가볍게 "촙". */
export function playSplash(intensity: number) {
  const c = getCtx()
  if (!c) return
  const now = c.currentTime
  const t = Math.min(1, Math.max(0, intensity))

  const master = c.createGain()
  master.gain.value = 0.55
  master.connect(c.destination)

  // 물이 튀는 노이즈 성분
  const noiseDur = 0.22 + t * 0.28
  const noise = c.createBufferSource()
  noise.buffer = getNoiseBuffer(c, noiseDur)
  const filter = c.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 1400 - t * 950
  filter.Q.value = 0.6
  const noiseGain = c.createGain()
  noiseGain.gain.setValueAtTime(0, now)
  noiseGain.gain.linearRampToValueAtTime(0.22 + t * 0.5, now + 0.006)
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + noiseDur)
  noise.connect(filter).connect(noiseGain).connect(master)
  noise.start(now)
  noise.stop(now + noiseDur + 0.02)

  // "퐁" 하고 내려가는 저음 (퐁당의 몸통)
  const osc = c.createOscillator()
  osc.type = 'sine'
  const startFreq = 480 - t * 260
  const endFreq = startFreq * 0.32
  osc.frequency.setValueAtTime(startFreq, now)
  osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.1 + t * 0.1)
  const oscGain = c.createGain()
  oscGain.gain.setValueAtTime(0.001, now)
  oscGain.gain.linearRampToValueAtTime(0.22 + t * 0.35, now + 0.008)
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2 + t * 0.18)
  osc.connect(oscGain).connect(master)
  osc.start(now)
  osc.stop(now + 0.45)
}

/** 버튼 클릭 등 UI 피드백용 짧은 블립. */
export function playClick() {
  const c = getCtx()
  if (!c) return
  const now = c.currentTime
  const osc = c.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(720, now)
  osc.frequency.exponentialRampToValueAtTime(420, now + 0.05)
  const gain = c.createGain()
  gain.gain.setValueAtTime(0.001, now)
  gain.gain.linearRampToValueAtTime(0.12, now + 0.004)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09)
  osc.connect(gain).connect(c.destination)
  osc.start(now)
  osc.stop(now + 0.12)
}
