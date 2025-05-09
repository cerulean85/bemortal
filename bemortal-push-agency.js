// 로그 설정 및 공통 모듈 로드
const log = require('./config/winston'); // 로그 기록을 위한 winston 설정
const cmn = require('./common'); // 공통 유틸리티 및 설정 로드
const reportDefault = cmn.getDefaultReport(); // 기본 보고서 설정
const cfg = cmn.getConfig(); // 설정 파일 로드

// 설정 정보 출력
log.info(`WEB HOOK URL: ${cfg.slack.webhookUrl}`);
log.info(`KAFKA IP    : ${cfg.kafka.address}`);
log.info(`KAFKA PORT  : ${cfg.kafka.port}`);

// Slack 설정
const Slack = require('slack-node');
const slack = new Slack();
slack.setWebhook(cfg.slack.webhookUrl); // Slack Webhook URL 설정

// Kafka 설정
const kafka = require('kafka-node');
const Consumer = kafka.Consumer; // Kafka Consumer 클래스
const Client = kafka.KafkaClient; // Kafka Client 클래스

// Kafka 클라이언트 생성
const client = new Client({ kafkaHost: `${cfg.kafka.address}:${cfg.kafka.port}` });

// Kafka 토픽 및 옵션 설정
const localTopic = reportDefault.services[reportDefault.local].topic; // 로컬 토픽 이름
const topics = [{ topic: localTopic, partition: 0, fromOffset: -1 }]; // Kafka 토픽 설정
const options = { autoCommit: true }; // 자동 커밋 옵션 활성화

// ndjson 파서 로드
const ndjsonParser = require('ndjson-parse');

// Kafka Consumer 생성
const consumer = new Consumer(client, topics, options);

// Kafka Offset 객체 생성
var offset = new kafka.Offset(client);

// 최신 오프셋 가져오기
offset.fetchLatestOffsets([localTopic], (err, offsets) => {
    if (err) {
        console.log(`error fetching latest offsets ${err}`); // 오류 발생 시 로그 출력
        return;
    }
    var latest = 1;
    // 각 파티션의 최신 오프셋 확인
    Object.keys(offsets[localTopic]).forEach(o => {
        latest = offsets[localTopic][o] > latest ? offsets[localTopic][o] : latest;
    });

    // 최신 오프셋으로 설정 (가장 최근 메시지부터 처리)
    consumer.setOffset(localTopic, 0, latest);
});

// 특정 오프셋으로 설정 (예: 10번째 메시지부터 처리)
consumer.setOffset(localTopic, 0, 10);

// 메시지 수신 이벤트 처리
consumer.on('message', function (message) {
    const report = cmn.getDefaultReport(); // 기본 보고서 가져오기
    const enablePush = report.push; // 푸시 활성화 여부 확인
    const parsed = ndjsonParser(message.value); // 메시지 파싱
    console.log(parsed);

    const reportMessage = parsed[0].report_message; // 보고 메시지 추출
    if (enablePush) {
        // 푸시 활성화 시 Slack으로 메시지 전송
        log.info(`푸시메시지: ${reportMessage} > ${enablePush}`);
        slack.webhook({
            channel: "#일반", // Slack 채널 설정
            text: reportMessage // 전송할 메시지
        }, (err, response) => {});
    } else {
        // 푸시 비활성화 시 메시지 출력
        console.log(reportMessage);
    }
});

// Kafka Consumer 오류 처리
consumer.on('error', function (err) {
    log.error(err); // 오류 로그 출력
});

// Kafka 메타데이터 갱신
client.refreshMetadata(["report_PUSH"], (error, data) => {
    if (error) {
        log.debug('Consumer refresh metadata error', error); // 메타데이터 갱신 오류 로그
    } else {
        consumer.on('message', (message) => {
            log.debug('Received', message); // 메시지 수신 로그
        });
    }
});
