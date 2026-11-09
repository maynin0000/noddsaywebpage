# 노디세이 웹사이트

노디세이(NODDSAY) 소개·회원가입·로그인 웹사이트입니다. Vite + React + TypeScript + Tailwind CSS.

운영에서는 웹과 API를 같은 주소(`https://k15a206.p.ssafy.io`)에서 서비스합니다. 웹 로그인 API(`/api/v1/web/auth`)는 운영 서버를 최신 develop으로 올린 뒤부터 동작합니다. 로그인은 HttpOnly 쿠키 + CSRF 방식이며, 계약은 백엔드 저장소의 `docs/development/web-auth-guide.md`를 따릅니다.

웹사이트는 로그인 없이 볼 수 있습니다. 회원가입·로그인은 웹사이트에서만 하고, 게임은 웹에 로그인한 뒤 **게임 시작**으로 엽니다. 설치된 앱이 열려 실행 요청에 연결되면 웹이 자동으로 승인하고, 앱이 같은 계정으로 로그인합니다(백엔드 `docs/development/web-unity-handoff.md`). 이 문서의 "웹·앱 확인 코드 비교 후 사용자 승인" 단계는 팀 결정(2026-11-04)으로 생략했습니다. 그 단계는 다른 프로그램이 `noddsay://` 실행 요청을 먼저 가로채 연결하는 경우를 막는 장치라서, 생략하면 그 보호가 없어집니다. 로그인하지 않았으면 로그인 화면으로, 앱이 응답하지 않으면 다운로드 안내로 이어집니다.

회원가입과 비밀번호 찾기는 실제 이메일 인증 API를 사용합니다. 인증번호와 인증 완료 후 증표는 각각 5분, 재발송은 60초 간격입니다. 비밀번호 찾기는 비밀번호가 있는 활성 이메일 계정에만 인증번호를 보내고, 가입되지 않은 이메일·Google 전용 계정·비활성 계정은 그 이유를 바로 알려 줍니다(팀 결정 2026-11-06, 가입 여부가 드러나는 점은 감수). 변경 성공 후 기존 웹·앱 로그인은 무효화되고 새 비밀번호로 다시 로그인합니다. 백엔드 Story S15P31A206-198 및 백엔드 저장소의 `docs/development/password-reset.md`에 맞춰 배포해야 합니다. 가입 여부를 알려 주는 백엔드 변경(Jira 198 후속, 404 `PASSWORD_RESET_ACCOUNT_NOT_FOUND`·409 `PASSWORD_RESET_GOOGLE_ONLY`·403 `ACCOUNT_DISABLED`)을 운영에 먼저 배포한 뒤 웹을 배포합니다. 웹이 먼저 나가면 가입되지 않은 이메일에도 "인증번호를 보냈어요"가 나옵니다. 개발 모드에서도 가짜 인증번호를 사용하지 않습니다.

## 로컬 실행

1. 백엔드를 로컬에서 띄웁니다. 게임 저장소(최신 develop)의 `Backend/`에서 웹 주소와 쿠키 설정을 로컬용으로 바꿔 실행합니다. `Backend/.env`에 `DB_PASSWORD`가 있어야 합니다.

   PowerShell:

   ```powershell
   $env:WEB_ORIGIN='http://localhost:5173'; $env:WEB_SECURE_COOKIE='false'; docker compose up --build -d
   ```

   Git Bash:

   ```bash
   WEB_ORIGIN=http://localhost:5173 WEB_SECURE_COOKIE=false docker compose up --build -d
   ```

   두 값 없이 다시 올리면 운영 설정으로 돌아가 가입·로그인이 403으로 실패합니다.

2. 웹을 실행합니다.

   ```bash
   npm install
   npm run dev
   ```

3. 브라우저에서 **http://localhost:5173** 을 엽니다. `127.0.0.1:5173`으로 열면 백엔드가 요청 출처를 거부합니다. `/api` 요청은 개발 서버가 `127.0.0.1:8080`으로 넘깁니다.

   8080 포트를 다른 프로그램이 쓰고 있으면 백엔드를 `API_PORT=8081`(필요하면 `DB_PORT=5433`도)로 띄우고, 웹은 `API_PROXY_TARGET=http://127.0.0.1:8081`을 주고 실행합니다.

   이미 실행 중인 `noddsay-mailtest` 환경은 API가 8082, 허용 웹 주소가 `http://localhost:5175`입니다. 이 환경에 연결할 때는 아래처럼 실행합니다.

   ```powershell
   $env:API_PROXY_TARGET='http://127.0.0.1:8082'; npm run dev -- --port 5175 --strictPort
   ```

   `noddsay-webtest` 환경은 API 8081, 웹 5174를 사용합니다. Docker가 켜져 있어도 웹의 연결 포트와 백엔드의 허용 주소가 다르면 요청이 실패합니다.

## 개발자 플레이 대시보드 (S15P31A206-249)

`/dev-dashboard`에서 실시간 경기, 네 자리의 전진/후진 및 입력 거부, 동작 성공/시간 초과/취소/대기, 팀별 진행·아이템·장애물/지형 충돌, 완주 시간과 CSV ZIP을 확인한다. 3초 갱신, 기간·맵·빌드·입력·상태 필터와 페이지 이동을 지원한다. 15초 이상 수신이 없으면 연결 확인이 필요한 경기로 표시한다.

기본 입력 필터는 카메라다. Unity 자동 Play 검증 기록은 **자동 검증**을 선택해야 보인다. 이전 빌드에서 수집하지 않은 자리별 수치는 0으로 채우지 않는다. 젓기는 실제 팔 왕복이 아니라 게임에 적용된 입력 횟수다. 팀 동작은 두 자리에 중복 계산하지 않는다.

백엔드 S15P31A206-247/V25와 Unity S15P31A206-248이 필요하다. 로그인한 계정 중 DB의 `noddsay.developer_accounts`에 승인된 계정만 조회·상세·CSV API를 사용할 수 있다. 브라우저에 별도 관리자 키를 저장하지 않는다. 권한 부여와 API/CSV 계약은 게임 저장소의 `docs/development/developer-dashboard.md`를 참고한다.

전용 로컬 검증은 API `127.0.0.1:18081`, 웹 `localhost:5178`을 사용한다. `API_PROXY_TARGET`과 서버 `WEB_ORIGIN`을 일치시킨다. 이 기능 브랜치 자체로 운영 사이트가 갱신되지는 않는다. Backend/V25를 먼저 배포하고 웹·Unity를 반영한다.

## 검사와 빌드

```bash
npm run lint
npm run build
```

빌드 결과는 `dist/`에 생깁니다. 운영 서버에서는 `dist/`를 `/var/www/web`에 두고, Nginx에서 `try_files $uri $uri/ /index.html;`로 새로고침해도 페이지가 열리게 합니다.

다운로드 버튼은 `/download/noddsay-win64.zip`을 가리킵니다. 설치 파일은 서버의 `/download/` 경로에 그 이름으로 올립니다. 파일이 없으면 버튼 자리에 "출시 준비 중"이 나오고, 파일을 올리면 웹을 다시 배포하지 않아도 버튼이 켜집니다. 올리는 동안 잘린 파일이 받아지지 않게 임시 이름으로 올린 뒤 이름을 바꿉니다(예: `noddsay-win64.zip.part`로 올리고 서버에서 `mv`). `client-releases`에 릴리스를 등록하면 버튼 아래에 버전과 용량이 나오고, 등록한 `downloadUrl`이 있으면 그 주소를 씁니다.

## 플레이 영상 넣기

확정 영상을 `src/assets/video/play.mp4`로 넣고 커밋한 뒤 웹을 다시 빌드·배포하면 기존 영상 소개 영역에서 자동으로 재생할 수 있습니다. 파일이 없으면 배포 화면에서는 제목·설명·재생 프레임·캡션을 포함한 영상 영역 전체가 숨겨집니다. 영상 영역은 게임 소개와 맵 사이에 있습니다.

영상은 H.264 MP4(소리는 AAC), 50MB 미만으로 준비해 주세요. 1~2분 길이의 1080p를 권장합니다. 커밋만으로 서버가 바뀌지는 않으며, 변경된 웹의 빌드·배포가 필요합니다.

미확정본은 `src/assets/video/play.local.mp4`에 보관합니다. 공개용 `play.mp4`가 없을 때 `npm run dev`에서만 이 파일로 기존 영상 영역을 미리 볼 수 있습니다. `*.local.mp4`는 Git과 배포 빌드에서 제외됩니다. 공개용과 로컬용이 모두 없으면 개발 화면에서도 영상 영역이 숨겨집니다.

## 글꼴

한글은 [Pretendard](https://github.com/orioncactus/pretendard)(© 2021 Kil Hyung-jin, SIL Open Font License 1.1)를 npm 패키지로 받아 사이트에 함께 배포합니다.
