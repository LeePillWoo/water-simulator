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

/** 오리 한 번 "꽥". urgency(0~1)가 클수록(수조가 격렬하게 출렁일수록) 음이 살짝 높고 급하게 짧아진다. */
export function playQuack(urgency: number) {
  const c = getCtx()
  if (!c) return
  const now = c.currentTime
  const t = Math.min(1, Math.max(0, urgency))
  const dur = 0.16 - t * 0.05

  const master = c.createGain()
  master.gain.value = 0.4
  master.connect(c.destination)

  const osc = c.createOscillator()
  osc.type = 'sawtooth'
  const startFreq = 620 + t * 90
  osc.frequency.setValueAtTime(startFreq, now)
  osc.frequency.exponentialRampToValueAtTime(startFreq * 0.55, now + dur)

  const filter = c.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 1100
  filter.Q.value = 1.4

  const gain = c.createGain()
  gain.gain.setValueAtTime(0.001, now)
  gain.gain.linearRampToValueAtTime(0.5, now + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.001, now + dur)

  osc.connect(filter).connect(gain).connect(master)
  osc.start(now)
  osc.stop(now + dur + 0.02)

  // 많이 다급할 때는 "꽥꽥" 두 번 연달아.
  if (t > 0.6) {
    const osc2 = c.createOscillator()
    osc2.type = 'sawtooth'
    osc2.frequency.setValueAtTime(startFreq * 1.05, now + dur + 0.05)
    osc2.frequency.exponentialRampToValueAtTime(startFreq * 0.58, now + dur + 0.05 + dur * 0.9)
    const gain2 = c.createGain()
    gain2.gain.setValueAtTime(0.001, now + dur + 0.05)
    gain2.gain.linearRampToValueAtTime(0.42, now + dur + 0.062)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + dur + 0.05 + dur * 0.9)
    osc2.connect(filter).connect(gain2).connect(master)
    osc2.start(now + dur + 0.05)
    osc2.stop(now + dur + 0.05 + dur + 0.02)
  }
}

/** 오리가 격렬하게 튀어올라 화면(카메라 렌즈)에 부딪히는 순간의 귀여운 "뽁-찍" 소리. */
export function playDuckSplat() {
  const c = getCtx()
  if (!c) return
  const now = c.currentTime

  const master = c.createGain()
  master.gain.value = 0.5
  master.connect(c.destination)

  // 부딪히는 순간의 둔탁한 "뽁".
  const thump = c.createBufferSource()
  thump.buffer = getNoiseBuffer(c, 0.05)
  const thumpFilter = c.createBiquadFilter()
  thumpFilter.type = 'lowpass'
  thumpFilter.frequency.value = 700
  const thumpGain = c.createGain()
  thumpGain.gain.setValueAtTime(0.7, now)
  thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)
  thump.connect(thumpFilter).connect(thumpGain).connect(master)
  thump.start(now)
  thump.stop(now + 0.06)

  // 납작해지며 삑 올라갔다 뚝 떨어지는 우스꽝스러운 삑.
  const squeak = c.createOscillator()
  squeak.type = 'triangle'
  squeak.frequency.setValueAtTime(260, now + 0.02)
  squeak.frequency.exponentialRampToValueAtTime(980, now + 0.11)
  squeak.frequency.exponentialRampToValueAtTime(140, now + 0.22)
  const squeakGain = c.createGain()
  squeakGain.gain.setValueAtTime(0.001, now + 0.02)
  squeakGain.gain.linearRampToValueAtTime(0.32, now + 0.05)
  squeakGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24)
  squeak.connect(squeakGain).connect(master)
  squeak.start(now + 0.02)
  squeak.stop(now + 0.26)
}

/** 쇠공 과적으로 수조 바닥이 깨지는 순간: 쩍 갈라지는 크랙 + 콸콸 물이 빠지는 소리. */
export function playFloorBreak() {
  const c = getCtx()
  if (!c) return
  const now = c.currentTime

  const master = c.createGain()
  master.gain.value = 0.7
  master.connect(c.destination)

  // 쩍! 갈라지는 크랙 (밝고 짧은 노이즈)
  const crack = c.createBufferSource()
  crack.buffer = getNoiseBuffer(c, 0.18)
  const crackFilter = c.createBiquadFilter()
  crackFilter.type = 'highpass'
  crackFilter.frequency.value = 900
  const crackGain = c.createGain()
  crackGain.gain.setValueAtTime(0.9, now)
  crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16)
  crack.connect(crackFilter).connect(crackGain).connect(master)
  crack.start(now)
  crack.stop(now + 0.2)

  // 묵직하게 무너지는 저음 쿵
  const thud = c.createOscillator()
  thud.type = 'sine'
  thud.frequency.setValueAtTime(160, now)
  thud.frequency.exponentialRampToValueAtTime(45, now + 0.35)
  const thudGain = c.createGain()
  thudGain.gain.setValueAtTime(0.6, now)
  thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)
  thud.connect(thudGain).connect(master)
  thud.start(now)
  thud.stop(now + 0.42)

  // 콸콸 빠지는 물 (필터 스윕이 점점 잦아드는 노이즈)
  const gushDur = 1.3
  const gush = c.createBufferSource()
  gush.buffer = getNoiseBuffer(c, gushDur)
  gush.loop = true
  const gushFilter = c.createBiquadFilter()
  gushFilter.type = 'bandpass'
  gushFilter.Q.value = 0.7
  gushFilter.frequency.setValueAtTime(1200, now + 0.05)
  gushFilter.frequency.exponentialRampToValueAtTime(220, now + gushDur)
  const gushGain = c.createGain()
  gushGain.gain.setValueAtTime(0.001, now + 0.05)
  gushGain.gain.linearRampToValueAtTime(0.4, now + 0.15)
  gushGain.gain.exponentialRampToValueAtTime(0.001, now + gushDur)
  gush.connect(gushFilter).connect(gushGain).connect(master)
  gush.start(now + 0.05)
  gush.stop(now + gushDur + 0.05)
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
