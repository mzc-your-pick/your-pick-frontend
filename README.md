# Your Pick Frontend

서바이벌 프로그램의 대결 결과를  
**“방송 결과(패널/방송 승자)”vs"대중 투표(민심)"** 로 비교해주는 웹 서비스 **Your Pick**의 프론트엔드 레포지토리입니다.

- 대상 프로그램 예시: 흑백요리사, 피지컬100, 쇼미더머니, 스우파 등
- 목적: 투표 참여 + 결과 비교 시각화 + 댓글 토론

---

## Tech Stack

- React (Vite)
- TypeScript
- SCSS (Sass, nesting 스타일)
- Nginx (EC2 배포, SPA 라우팅 + API Reverse Proxy)
- Node.js / npm

---

## Architecture (AWS VPC)

- Frontend EC2: Public Subnet + IGW
  - Nginx로 dist/ 정적 서빙

  - /api/\* 요청은 Backend로 Reverse Proxy

- Backend EC2 / DB: Private Subnet + NAT
  - Frontend SG에서 Backend 포트만 허용 (Inbound 최소화)

---

## Pages (UI Flow)

### 1) 메인 페이지

- 로고 + 슬로건
- “투표하러 가기” CTA 버튼
  <img width="1344" height="840" alt="스크린샷 2026-01-27 오후 4 31 08" src="https://github.com/user-attachments/assets/d9a72e41-b97a-42dd-be9c-08cf6337a280" />

### 2) 프로그램 선택 페이지

- 프로그램 카드 리스트 (이미지 포함)
- 프로그램 선택 → `program_id`를 쿼리로 넘겨 Topics로 이동
  <img width="1344" height="840" alt="스크린샷 2026-01-27 오후 4 32 29" src="https://github.com/user-attachments/assets/47a3102f-58d4-4a8e-9084-f93fc6f750c6" />

### 3) 투표 주제 선택 페이지

- `program_id` 기반으로 주제 리스트 로드
- 회차/라운드/참가자/키워드 필터 + 정렬
- 주제 카드 선택 → Vote로 이동 (topic_id 전달)
  <img width="1344" height="840" alt="스크린샷 2026-01-27 오후 4 32 56" src="https://github.com/user-attachments/assets/28138350-cfe8-429e-ad5a-ba588ca3bed8" />

### 4) 투표 페이지

- `topic_id`로 주제 상세 로드
- 유튜브 embed (video_url 없으면 안내)
- `vote_type`에 따라 투표 UI 형태 분기
  - type 1: 1명 합격/불합격 (vote_choice: 1=합격, 2=불합격)
  - type 2: 2명 A vs B (vote_choice: 1=1번 참가자, 2=2번 참가자)
  - type 3: 3인 이상 다자 선택 (vote_choice: 1~N)
    <img width="1344" height="840" alt="스크린샷 2026-01-27 오후 4 33 30" src="https://github.com/user-attachments/assets/432bb239-42a8-4182-b4cf-eae6881f9c6a" />

### 5) 결과 + 댓글 페이지

- 민심 결과: 백엔드 집계 결과 기반 퍼센트 bar 표시

- 방송 결과: 득표수 없이 “승자만” 표시 + 민심과 일치 여부 표시

- 댓글: 로그인 없이 id/pw 기반 작성 + 삭제(pw 검증)

- 댓글 시간 표시: 몇초/몇분/몇시간 전, 하루 이상은 날짜 표시
  <img width="1344" height="840" alt="스크린샷 2026-01-27 오후 4 37 25" src="https://github.com/user-attachments/assets/f641ad95-27ad-43c8-809b-5b833e9d5db6" />

---

## API Contract

> 프론트는 기본적으로 /api 경로로 호출하고, Nginx가 백엔드로 프록시합니다.
> (예: 브라우저에서는 /api/v1/... 형태로 요청)

### Program

#### GET Program List

- GET `/api/vi/programs`

#### GET Program Detail

- GET `/api/v1/programs/{program_id}`

Response:

```json
{
  "id": 1,
  "title": "흑백요리사",
  "description": "넷플릭스 요리 서바이벌",
  "status": "방영중",
  "image_url": null,
  "created_at": "2026-01-27T07:42:38"
}
```

### Topics

#### GET Topic List (by program_id)

- GET `/api/v1/topics?program_id=1`

Response:

```json
[
  {
    "id": 1,
    "program_id": 1,
    "topic_title": "최강록 VS 요리괴물",
    "episode": 1,
    "match_type": "1대1",
    "participants": ["최강록", "요리괴물"],
    "video_url": null,
    "vote_type": 2,
    "actual_result": 1,
    "created_at": "2026-01-27T07:42:38",
    "participant_images": [
      {
        "id": 2,
        "participant_name": "요리괴물",
        "image_url": "https://example.com/chef2.jpg"
      },
      {
        "id": 1,
        "participant_name": "최강록",
        "image_url": "https://example.com/chef1.jpg"
      }
    ]
  }
]
```

#### GET Topic Detail

- GET `/api/v1/topics/{topic_id}`
  Response(에시):

```json
{
  "id": 1,
  "program_id": 1,
  "topic_title": "최강록 VS 요리괴물",
  "episode": 1,
  "match_type": "1대1",
  "participants": ["최강록", "요리괴물"],
  "video_url": null,
  "vote_type": 2,
  "actual_result": 1,
  "created_at": "2026-01-27T07:42:38",
  "participant_images": [
    {
      "id": 1,
      "participant_name": "최강록",
      "image_url": "https://example.com/chef1.jpg"
    },
    {
      "id": 2,
      "participant_name": "요리괴물",
      "image_url": "https://example.com/chef2.jpg"
    }
  ]
}
```

### Votes

#### POST Vote

- POST `/api/v1/topics/{topic_id}/votes`
  vote_choice 규칙:

* vote_type=1 → 1=합격, 2=불합격

* vote_type=2 → 1=1번 참가자, 2=2번 참가자

* vote_type=3(다인원) → 1~N=참가자 순번

Response:

```json
{
  "success": true,
  "message": "string",
  "data": {
    "id": 0,
    "topic_id": 0,
    "vote_choice": 0,
    "voted_at": "2026-01-28T02:44:33.561Z"
  }
}
```

> **중요** : 댓글 작성은 vote_id가 필요하므로, 투표 성공 후 Result로 이동할 때 vote_id를 쿼리에 포함합니다.
> 예: /result?topic_id=1&vote_id=123

### Result (권장 형태)

#### GET Result

- GET `/api/v1/topics/{topic_id}/results`
  Response:

```json
{
  "success": true,
  "data": {
    "topic_id": 1,
    "topic_title": "최강록 VS 요리괴물",
    "vote_type": 2,
    "actual_result": 1,
    "public_votes": {
      "total": 1,
      "results": {
        "1": { "count": 1, "percent": 100 }
      }
    },
    "participants": ["최강록", "요리괴물"],
    "match": true
  },
  "error": null,
  "message": null
}
```

- `public_votes.results`의 key `"1"`, `"2"`… 는 `vote_choice`(1-based) 의미

- 방송 결과는 득표수가 아니라 `actual_result`(승자)만 제공됨 → 프론트는 “승자만 표시”

### Comments

#### GET Comment List

- GET `/api/v1/topics/{topic_id}/comments`
  Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 0,
      "vote_id": 0,
      "content": "string",
      "comment_user_name": "string",
      "created_at": "2026-01-28T03:08:27.288Z"
    }
  ],
  "total": 0
}
```

#### POST Comment (Create)

- POST `/api/v1/votes/{vote_id}/comments`
  Body:

```json
{
  "content": "string",
  "comment_user_name": "string",
  "comment_password": "string"
}
```

Response:

```json
{
  "id": 0,
  "vote_id": 0,
  "content": "string",
  "comment_user_name": "string",
  "created_at": "2026-01-28T03:13:27.075Z"
}
```

#### DELETE Comment

- DELETE `/api/v1/comments/{comment_id}`
  Body:

```json
{
  "comment_password": "string"
}
```

> 댓글 수정은 현재 프론트에서 제외(삭제만 지원)

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

- 정적 파일: `dist/` 서빙

- SPA 라우팅: `try_files ... /index.html` fallback 필요

- API 프록시: `/api/*` → Private Subnet Backend로 reverse proxy

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
