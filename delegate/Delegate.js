const appRoot = require('app-root-path'); // 프로젝트 루트 경로 관리
const schema = require(`${appRoot}/delegate/Schema`); // 데이터 스키마 관련 모듈
const log = require(`${appRoot}/config/winston`); // 로그 기록을 위한 winston 설정
const requestIP = require('request-ip'); // 클라이언트 IP 주소를 가져오기 위한 모듈

// Delegate 클래스 정의
module.exports = function Delegate() {
    // 공통 결과 생성 함수
    const createResult = (isSuccess, errorCode, errorMessage = '') => {
        const result = schema.getResult(); // 기본 결과 스키마 가져오기
        result.is_success = isSuccess;
        result.error_code = errorCode;
        if (errorMessage) result.error_message = errorMessage;
        return result;
    };

    // 성공 결과 생성 함수
    this.getSuccessResult = () => createResult(true, 200);

    // 실패 결과 생성 함수
    this.getFailResult = (errorMessage) => createResult(false, 400, errorMessage);

    // 결과를 클라이언트에 전송하는 함수
    this.sendResult = (res, result) => {
        res.send(schema.serialize(result)); // 결과를 직렬화하여 클라이언트에 전송
    };

    // 결과 리스트를 원하는 개수로 제한하는 함수
    this.thin = (qResult, wantCount = 1) => {
        if (qResult?.list?.length > 0) {
            try {
                qResult.list = qResult.list.slice(0, wantCount); // 리스트를 원하는 개수로 자르기
            } catch (err) {
                log.info(err); // 오류 발생 시 로그 출력
            }
        }
        return qResult; // 제한된 결과 반환
    };

    // 현재 날짜를 반환하는 함수 (YYYY-MM-DD 형식)
    this.getCurrentDate = () => {
        const dateObject = new Date();
        const year = dateObject.getFullYear();
        const month = (`0${dateObject.getMonth() + 1}`).slice(-2);
        const date = (`0${dateObject.getDate()}`).slice(-2);
        return `${year}-${month}-${date}`; // YYYY-MM-DD 형식 반환
    };

    // 현재 날짜와 시간을 반환하는 함수 (YYYY-MM-DD HH:mm:ss 형식)
    this.getCurrentDateTime = () => {
        const dateObject = new Date();
        const year = dateObject.getFullYear();
        const month = (`0${dateObject.getMonth() + 1}`).slice(-2);
        const date = (`0${dateObject.getDate()}`).slice(-2);
        const hours = (`0${dateObject.getHours()}`).slice(-2);
        const minutes = (`0${dateObject.getMinutes()}`).slice(-2);
        const seconds = (`0${dateObject.getSeconds()}`).slice(-2);
        return `${year}-${month}-${date} ${hours}:${minutes}:${seconds}`; // YYYY-MM-DD HH:mm:ss 형식 반환
    };

    // 내부 비동기 작업 처리 함수
    this.promiseInnerHandler = async (promise, copyAction) => {
        try {
            const queryResult = await promise;
            if (!queryResult.is_success) throw new Error("쿼리 조회 실패!");

            const returnResult = this.getSuccessResult();
            returnResult.list = queryResult.list;
            if (copyAction) copyAction(queryResult, returnResult);
        } catch (err) {
            log.error(err.message || "Unknown error"); // 오류 메시지 로그 출력
        }
    };

    // 비동기 작업 처리 및 클라이언트 응답 함수
    this.promiseHandler = async (promise, req, res, copyAction) => {
        const userIP = requestIP.getClientIp(req).replace('::ffff:', ''); // 클라이언트 IP 가져오기
        log.info(`[${this.getCurrentDateTime()}] From /${userIP} ${req.method} ${req.originalUrl}`); // 요청 정보 로그 출력

        try {
            const queryResult = await promise;
            if (!queryResult.is_success) throw new Error(req.failMessage);

            const returnResult = this.getSuccessResult();
            returnResult.list = queryResult.list;
            if (copyAction) copyAction(queryResult, returnResult);
            this.sendResult(res, returnResult);
        } catch (err) {
            log.error(err.message || "Unknown error"); // 오류 메시지 로그 출력
            this.sendResult(res, this.getFailResult(err.message || "Unknown error"));
        }
    };
};