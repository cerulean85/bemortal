// 필요한 모듈 로드
const express = require('express'); // Express 웹 프레임워크
const cors = require("cors"); // CORS(Cross-Origin Resource Sharing) 설정
const bodyParser = require('body-parser'); // HTTP 요청 본문(body) 파싱
const appRoot = require('app-root-path'); // 프로젝트 루트 경로 관리
const monit = require(`${appRoot}/delegate/MonitDelegate`).instance; // MonitDelegate 인스턴스 로드

// Express 애플리케이션 생성
const app = express();

// 미들웨어 설정
app.use(bodyParser.urlencoded({ extended: true })); // URL-encoded 데이터 파싱
app.use(bodyParser.json()); // JSON 데이터 파싱
app.use(cors()); // CORS 활성화

// 서버 포트 설정
app.set('port', process.env.PORT || 6601); // 환경 변수 PORT 또는 기본값 6601 사용


// MonitDelegate를 사용한 작업 모니터링 시작 (한국 지역)
monit.recursiveSelect_WorkCrawlTable(); // keyword_list 테이블 모니터링
monit.recursiveSelect_WorkMergeListTable(); // merge_list 테이블 모니터링
monit.recursiveSelect_WorkMergeUploadTable(); // merge_upload 테이블 모니터링

// MonitDelegate를 사용한 작업 모니터링 시작 (중국 지역)
monit.recursiveSelect_WorkCrawlTable(locale = "CN"); // keyword_list 테이블 모니터링 (중국)
monit.recursiveSelect_WorkMergeListTable(locale = "CN"); // merge_list 테이블 모니터링 (중국)
monit.recursiveSelect_WorkMergeUploadTable(locale = "CN"); // merge_upload 테이블 모니터링 (중국)