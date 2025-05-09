// 필요한 모듈 로드
const appRoot = require('app-root-path'); // 프로젝트 루트 경로 관리
const log = require(`${appRoot}/config/winston`); // 로그 기록을 위한 winston 설정
const mysql = require(`${appRoot}/handler/mysql`); // MySQL 데이터베이스 핸들러
const Delegate = require(`${appRoot}/delegate/Delegate`); // Delegate 클래스 로드
const cmn = require(`${appRoot}/common`); // 공통 유틸리티 및 설정 로드

// 설정 파일 로드
let cfg = cmn.getConfig();

// Kafka 설정 및 초기화
log.info(`KAFKA IP    : ${cfg.kafka.address}`);
log.info(`KAFKA PORT  : ${cfg.kafka.port}`);

const kafka = require('kafka-node');
const { Producer, KafkaClient } = kafka;
const client = new KafkaClient({ kafkaHost: `${cfg.kafka.address}:${cfg.kafka.port}` });
const producer = new Producer(client);

// Kafka 프로듀서 준비 상태 확인
producer.on('ready', () => {
    log.debug('Producer ready. Refresh metadata');
    try {
        client.refreshMetadata(['report_PUSH'], (error) => {
            if (error) {
                log.debug('Producer refresh metadata error:', error);
            }
        });
    } catch (err) {
        log.debug(err);
    }
});

// 보고 메시지 생성 함수
function createReportMessage(locale, idList, tableName) {
    return `
        [WORK-${locale}] 지연 중인 수집 작업(${idList.length})이 존재합니다.
        지연번호: (${idList})
        테이블: ${tableName}
    `;
}

// 보고 전송 함수
function sendReport(locale, idList, tableName) {
    const reportMessage = createReportMessage(locale, idList, tableName); // 보고 메시지 생성
    const reportDefault = cmn.getDefaultReport(); // 기본 보고서 설정 로드
    reportDefault.form.report_message = reportMessage; // 메시지 추가
    reportDefault.form.invoked_at = cmn.getCurrentDateTime(); // 호출 시간 추가
    reportDefault.form.invoked_ip = cfg.monit.address; // 호출 IP 추가
    reportDefault.form.invoked_function = `recursiveSelect_Work${tableName}`; // 호출 함수명 추가

    const payloads = [
        { topic: "report_PUSH", messages: JSON.stringify(reportDefault.form), partition: 0 }
    ];

    // Kafka를 통해 보고 전송
    producer.send(payloads, (err, data) => {
        log.debug(`[WORK-${locale}] 지연된 ${tableName} 작업 (${idList.length})개에 대한 대응을 요청하였습니다.`);
    });
}

// 쿼리 리스트 생성 함수
function getQueryList(locale, table) {
    const maxDiffDay = cfg.slack.max_diff_day; // 최대 지연 일수
    const minDiffHour = cfg.slack.min_diff_hour; // 최소 지연 시간
    const maxCount = cfg.slack.max_count; // 최대 조회 개수

    const commonSelect = `
        SELECT 
            *
        FROM ${table}
        WHERE (
            status = ...
        ) AND (
            DATEDIFF(NOW(), regdate) < ${maxDiffDay} AND 
            TIMESTAMPDIFF(HOUR, regdate, NOW()) >= ${minDiffHour}
        )
        LIMIT ${maxCount}
    `;

    // 지역(locale)에 따라 다른 조건 추가
    if (locale === "KR") {
        return [`${commonSelect} AND any_status...`];
    } else if (locale === "CN") {
        return [`${commonSelect} AND any_status...`];
    }

    return [];
}

// 반복적으로 쿼리를 실행하는 함수
function recursiveSelect(queryList, intervalTime, queryHandler, locale) {
    this.promiseInnerHandler(new Promise(async (resolve) => {
        for (const query of queryList) {
            let qResult = await mysql.select(query, locale); // 쿼리 실행
            queryHandler(qResult, locale); // 결과 처리
            await sleep(intervalTime); // 대기 시간
        }
    }));

    // 대기 시간 함수
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
}

// 특정 테이블에 대해 반복적으로 작업을 처리하는 함수
function recursiveSelectWorkTable(locale, tableName, queryIntervalTimeMs, queryRecursiveIntervalTimeMs) {
    const queryList = getQueryList(locale, tableName); // 쿼리 리스트 생성
    const queryHandler = (result, locale) => {
        const idList = result.list.map(item => item.idx); // 결과에서 ID 리스트 추출
        if (idList.length === 0) return; // 결과가 없으면 종료

        sendReport(locale, idList, tableName); // 보고 전송
    };

    // 첫 번째 실행
    recursiveSelect(queryList, queryIntervalTimeMs, queryHandler, locale);

    // 주기적으로 실행
    setInterval(() => {
        recursiveSelect(queryList, queryIntervalTimeMs, queryHandler, locale);
    }, queryRecursiveIntervalTimeMs);
}

// MonitDelegate 클래스 정의
function MonitDelegate() {
    Delegate.call(this); // 부모 클래스 호출

    // 데이터베이스 샘플 쿼리 실행
    this.innerEcho = () => {
        this.promiseInnerHandler(new Promise(async (resolve) => {
            const query = 'SELECT * FROM scraw_naver_datainfo LIMIT 5'; // 샘플 쿼리
            const qResult = await mysql.select(query); // 쿼리 실행
            log.debug(qResult); // 결과 로그 출력
            resolve(qResult); // 결과 반환
        }));
    };

    // keyword_list 테이블 모니터링
    this.recursiveSelect_WorkCrawlTable = (locale = "KR") => {
        const queryIntervalTimeMs = cfg.slack.query_interval_time_ms; // 쿼리 간격
        const queryRecursiveIntervalTimeMs = cfg.slack.query_recursive_interal_time_ms; // 반복 간격
        recursiveSelectWorkTable(locale, 'kl', queryIntervalTimeMs, queryRecursiveIntervalTimeMs);
    };

    // keyword_upload 테이블 모니터링
    this.recursiveSelect_WorkUploadTable = (locale = "KR") => {
        const queryIntervalTimeMs = cfg.slack.query_interval_time_ms;
        const queryRecursiveIntervalTimeMs = cfg.slack.query_recursive_interal_time_ms;
        recursiveSelectWorkTable(locale, 'ku', queryIntervalTimeMs, queryRecursiveIntervalTimeMs);
    };

    // merge_list 테이블 모니터링
    this.recursiveSelect_WorkMergeListTable = (locale = "KR") => {
        const queryIntervalTimeMs = cfg.slack.query_interval_time_ms;
        const queryRecursiveIntervalTimeMs = cfg.slack.query_recursive_interal_time_ms + 5; // 추가 간격
        recursiveSelectWorkTable(locale, 'ml', queryIntervalTimeMs, queryRecursiveIntervalTimeMs);
    };

    // merge_upload 테이블 모니터링
    this.recursiveSelect_WorkMergeUploadTable = (locale = "KR") => {
        const queryIntervalTimeMs = cfg.slack.query_interval_time_ms;
        const queryRecursiveIntervalTimeMs = cfg.slack.query_recursive_interal_time_ms + 10; // 추가 간격
        recursiveSelectWorkTable(locale, 'mu', queryIntervalTimeMs, queryRecursiveIntervalTimeMs);
    };
}

// MonitDelegate 인스턴스 내보내기
module.exports = { instance: new MonitDelegate() };
