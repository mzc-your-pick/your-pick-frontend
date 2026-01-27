# Your Pick Frontend

서바이벌 프로그램의 대결 결과를  
**“패널 선택(방송 결과)”vs"대중 투표(민심)"** 로 비교해주는 웹 서비스 **Your Pick**의 프론트엔드 레포지토리입니다.

- 대상 프로그램 예시: 흑백요리사, 피지컬100, 쇼미더머니, 스우파 등
- 목적: 투표 참여 + 결과 비교 시각화 + 댓글 토론

---

## Tech Stack

- React (Vite)
- SCSS (Sass, nesting 스타일)
- Nginx (EC2 배포)
- Node.js / npm

> TypeScript를 사용하지만, 구현 단계에서는 타입 엄격성보다 개발 속도를 우선합니다.

---

## Pages (UI Flow)

### 1) 메인 페이지

- 로고 + 슬로건
- “투표하러 가기” CTA 버튼

### 2) 프로그램 선택 페이지

- 프로그램 카드 리스트 (이미지 포함)
- 프로그램 선택 → 투표 주제 선택으로 이동

### 3) 투표 주제 선택 페이지

- 회차/라운드/참가자 기반 필터링(프론트 UI 기준)
- 주제 카드 선택 → 투표 페이지 이동

### 4) 투표 페이지

- URL로 `topic_id`를 받아 상세 로딩
- 유튜브 링크(대결 영상) 임베드
- `vote_type`에 따라 투표 UI 형태 분기
  - type 1: 1명 합격/불합격
  - type 2: 2명 A vs B
  - type 3+: 다자 선택 (확장 가능)

### 5) 결과 + 댓글 페이지

- 민심 결과: 득표수 기반 퍼센트 계산(프론트)
  - 총 투표수 + 각 항목 득표수 + 퍼센트 bar 표시
- 방송 결과: 방송 결과가 없으면(null) 민심 결과만 표시
- 댓글: 로그인 없이 id/pw 기반 작성 + (수정/삭제는 pw 검증 방식으로 연동 예정)

---

## API Contract (Draft)

> 백엔드 확정 전 임시 스펙(연동 시 변경될 수 있음)

### Program

```js
{
  id: "1",
  title: "흑백요리사2",
  subtitle: "셰프들의 승부, 민심은 누구 편?",
  status: "ONGOING",
  img_url: "/~.jpg"
}
```

### Topic

```js
{
  id: "1",
  program_id: "1",
  episode: 1,
  round: "1차 경연",
  title: "최강록 vs 요리괴물",
  participants: ["최강록", "요리괴물"],
  created_at: "2026-01-20T10:00:00.000Z",
  vote_type: 2
}
```

### Vote Detail (Draft)

- youtube_url: 대결 영상 URL
- participants_imgs: 참가자 이미지 배열(선택 사항)

### Result (권장 형태)

> 퍼센트는 파생값이므로 프론트에서 계산합니다.

```js
public_result: [
  { label: "최강록", votes: 62 },
  { label: "요리괴물", votes: 38 }
],
broadcast_result: null // 또는 동일 구조
```

### Comment (Draft)

- Create: { author, password, content }

- Edit/Delete: { password } 기반 검증 후 처리(백엔드에서 401/403 응답)

---

## Local Development

### 1) Install

```bash
npm install
```

### Run (Vite)

```bash
npm run dev
```

### Build

```bash
npm run build
```

---

## Deployment(EC2 + Nginx)

### Build output

- Vite 빌드 결과: `dist/`

### Nginx serving (요약)

- 정적 파일: dist/ 서빙

- SPA 라우팅: try_files ... /index.html fallback 필요

- (추후) /api 경로는 백엔드로 reverse proxy 예정

> 운영 정석: /var/www/... 아래로 dist를 이동해 서빙하는 방식 권장

---

## Troubleshooting (Cloud)

### 1) EC2에서 apt install 실패 (패키지 다운로드 불가)

#### 증상

- sudo apt -y install curl ca-certificates git build-essential 실행 시
  - Failed to fetch ...

  - Cannot initiate the connection ... (101: Network is unreachable)

- ping -c 3 8.8.8.8 → 100% packet loss

#### 원인

- 서버가 외부 인터넷에 나갈 수 없는 상태.

- 특히 에러 로그에 IPv6 주소가 보였고, **라우팅/인터넷 경로 문제(IGW, 라우팅 테이블, 퍼블릭 IP, SG/NACL 등)**를 먼저 점검해야 하는 상황.

#### 확인 포인트

- ip route로 기본 게이트웨이 확인

- 서브넷 라우팅 테이블에 0.0.0.0/0 → IGW 존재 여부

- EC2에 Public IPv4 할당 여부

- 보안그룹 아웃바운드(기본 허용이 아니면 막힘)

#### 해결(결론)

- 네트워크 경로를 정상화한 후 apt update/apt install이 정상 동작.
  - (이 과정에서 SG 수정/재부팅 등과 엮여 SSH 끊김 이슈도 같이 발생 → ec2 메모리용량 증가로 해결)

### 2) Nginx가 dist/index.html을 읽지 못함 (Permission denied)

#### 증상

- error log:
  - `stat() "/home/ubuntu/.../dist/index.html" failed (13: Permission denied)`

- `sudo -u www-data stat .../index.html`도 Permission denied

#### 원인 (namei로 확정)

- 상위 디렉토리 권한 문제:
  - `/home/ubuntu`가 `drwxr-x---` 형태라

  - Nginx 사용자(`www-data`)가 **디렉토리 traverse(x)**를 못 해서 접근 불가.

#### 해결

- 최소 권한으로 통과 권한만 부여:
  - `sudo chmod o+x /home/ubuntu`

- 이후 www-data stat 성공 → nginx reload → 정상 접속

> 운영 관점 정석: /var/www/...로 dist를 옮기고 Nginx root를 거기로 두는 방식이 더 깔끔함.

### 3) EC2에서 git push 실패 (GitHub 비밀번호 인증 중단)

#### 증상

- `git push origin main` 시:
  - `Password authentication is not supported for Git operations.`

  - `Invalid username or token`

#### 원인

- GitHub는 HTTPS push에서 ID/PW 인증을 폐지했고, PAT(토큰) 또는 SSH만 허용.

#### 해결

- SSH를 안 쓸 경우:
  - HTTPS + PAT 생성 후 “Password” 자리에 토큰 입력

  - 매번 입력이 싫으면 credential helper 설정
