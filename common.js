const appRoot = require('app-root-path');
const log = require(`${appRoot}/config/winston`)
const fs = require("fs");
const yaml = require('js-yaml');
const { report } = require('process');

function getCurrentDateTime () {
    const dateObject = new Date();
    const date = (`0${dateObject.getDate()}`).slice(-2);
    const month = (`0${dateObject.getMonth() + 1}`).slice(-2);
    const year = dateObject.getFullYear();
    const hours = (`0${dateObject.getHours()}`).slice(-2);
    const minutes = (`0${dateObject.getMinutes()}`).slice(-2);
    const seconds = (`0${dateObject.getSeconds()}`).slice(-2);
    return `${year}-${month}-${date} ${hours}:${minutes}:${seconds}`
 }

function getDefaultReport() {
    let reportDefault = undefined
    try {
        reportDefault = yaml.load(fs.readFileSync(`${appRoot}/report.yaml`, 'utf8'));
    } catch (e) {
        reportDefault = undefined
        log.error(e)
    }

    if (reportDefault === undefined) {
        log.info("Can't load config.yaml")
    }

    return reportDefault
}

function getConfig() {
    let cfg = undefined
    try {
        cfg = yaml.load(fs.readFileSync(`${appRoot}/config.yaml`, 'utf8'));
    } catch (e) {
        cfg = undefined
        log.error(e)
    }

    if (cfg === undefined) {
        log.info("Can't load config.yaml")
    }

    return cfg
}


 
 module.exports = {
    "getCurrentDateTime": getCurrentDateTime,
    "getDefaultReport"  : getDefaultReport,
    "getConfig"         : getConfig
 }