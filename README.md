# 물 시뮬레이터 (Water Simulator)

수조를 마우스/터치로 흔들어 파도를 만들고, 나무공·쇠공·돛단배·오리 인형을 물에 떨어뜨려
밀도에 따라 뜨고 가라앉는 모습을 구경하는 3D 웹 장난감입니다.

**데모:** <https://leepillwoo.github.io/water-simulator/>

## 기술 스택

- React 19 + TypeScript, Vite 8
- [@react-three/fiber](https://github.com/pmndrs/react-three-fiber) / [drei](https://github.com/pmndrs/drei) — Three.js 씬 구성
- Zustand — UI ↔ 씬 상태 공유
- 커스텀 CPU 얕은물 방정식(shallow-water equation) 파동 솔버 + GLSL 셰이더
- Web Audio API로 직접 합성한 효과음 (외부 오디오 파일 없음)
- oxlint

## 시작하기

```bash
npm install
npm run dev      # 개발 서버
npm run build    # 타입체크 + 프로덕션 빌드 (dist/)
npm run preview  # 빌드 결과 미리보기
npm run lint      # oxlint
```

`main` 브랜치에 푸시하면 [.github/workflows/deploy.yml](.github/workflows/deploy.yml)이
자동으로 빌드해 GitHub Pages에 배포합니다.

## 폴더 구조

```text
src/
  main.tsx, App.tsx        진입점, 캔버스 + UI 오버레이 마운트
  labLayout.ts              수조 치수 · 파동 · 물체 낙하 관련 전역 상수 (렌더링/물리 공용 소스)
  store/useSimStore.ts      재생 상태, 리셋 신호, 낙하한 공 목록 (zustand)
  physics/
    toyTypes.ts             물체 종류 정의(TOY_DEFS) — 밀도, 파츠 지오메트리, 유영 여부
    ballBody.ts              물체 하나의 낙하/부력/충돌 물리 스텝
    ballMaterial.ts           물체 표면의 "젖음" 셰이더 재질
    waveSolver.ts             CPU 얕은물 방정식 파동 솔버
  scene/
    Scene.tsx                최상위 씬 구성(카메라, 조명, 수조, 물, 물체 배치)
    Lab.tsx                   조명 설정
    ResponsiveCamera.tsx      화면 크기에 따른 카메라 보정
    water/
      TankStructure.tsx, GlassWall.tsx, wallShader.ts   수조 구조물 + 유리 셰이더
      WaterSurface.tsx, shaders.ts, heightFieldTexture.ts 물 표면 렌더링
      FloatingBodies.tsx      낙하한 물체들을 씬에 렌더링
      TiltRig.tsx, tiltState.ts  드래그로 수조를 기울이는 인터랙션
      waterFieldState.ts       파동 솔버 인스턴스 공유
      EnvMapBaker.tsx, envMap.ts, sunLight.ts  환경 큐브맵/태양광
  ui/ControlPanel.tsx        좌측 컨트롤 패널 (재생/리셋/물체 낙하 버튼)
  audio/soundEngine.ts       클릭·물튀김 효과음 합성
```

## 확장 포인트

- **새 물체 종류 추가**: [toyTypes.ts](src/physics/toyTypes.ts)의 `TOY_DEFS`에 밀도·파츠(구 조합)를
  추가하고 [ControlPanel.tsx](src/ui/ControlPanel.tsx)의 `TOY_ORDER`에 넣으면 끝. 렌더링·부력·파동 주입은
  전부 이 정의를 공용으로 참조하므로 물리 로직을 따로 손댈 필요가 없습니다.
- **수조 크기/물리 튜닝**: [labLayout.ts](src/labLayout.ts) 상수 하나만 바꾸면 렌더링과
  `WaveSolver`가 동일한 값을 그대로 참조합니다.
- **파동 해상도**: `GRID_RES`를 올리면 디테일이 좋아지지만 CPU 솔버라 프레임 비용이
  `O(GRID_RES²)`로 늘어납니다. 필요해지면 GPU ping-pong 텍스처 솔버로 교체할 여지를 열어둔
  구조입니다 (`waveSolver.ts` 상단 주석 참고).

## 알려진 제약

- 단일 페이지 3D 앱이라 라우트 기반 코드 스플리팅 대상이 없어 JS 번들이 약 1.1MB(gzip 310KB)로
  하나로 묶입니다. Three.js 비중이 커서 현재로선 의도된 상태입니다.
