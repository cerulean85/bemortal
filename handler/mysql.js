const mysql   = require('mysql2/promise');
const appRoot = require('app-root-path')
const winston = require(`${appRoot}/config/winston`)
const config = require(`${appRoot}/config/db`)

const poolKR = mysql.createPool(config.mysql);
const poolCN = mysql.createPool(config.mysql_cn);

const getPool = (locale) => {
    if (locale == "KR") return poolKR
    if (locale == "CN") return poolCN
}

// console.log("???")
const selectQuery = async (query, locale="KR") => {
    const result = { is_success: false, list: [] }
    try {
        const pool = getPool(locale)
        const connection = await pool.getConnection(async conn => conn);
        const [qResult] = await connection.query(query)
        connection.release()
        result.is_success = true
        result.list = qResult
    } catch(err) {
        winston.debug(query.replaceAll('\n', ''))
        winston.error(`[MySQL Error: SELECT] ${err.message}` )
    }
    return result
}

const insertQuery = async (query, locale="KR") => {
    const result = { is_success: false, inserted_no: 0 }
    try {
        const pool = getPool(locale)
        const connection = await pool.getConnection(async conn => conn);
        const [qResult] = await connection.query(query)
        connection.release()
        result.is_success = true
        result.inserted_no = qResult.insertId
    } catch(err) {
        winston.debug(query.replaceAll('\n', ''))
        winston.error(`[MySQL Error: INSERT] ${err.message}` )
    }
    return result
}

const updateQuery = async (query, locale="KR") => {
    const result = { is_success: false, updated_count: 0 }
    try {
        const pool = getPool(locale)
        const connection = await pool.getConnection(async conn => conn);
        const [qResult] = await connection.query(query)
        connection.release()
        result.is_success = true
        result.updated_count = qResult.changedRows
    } catch(err) {
        winston.debug(query.replaceAll('\n', ''))
        winston.error(`[MySQL Error: UPDATE] ${err.message}` )
    }
    return result
}

const deleteQuery = async (query, locale="KR") => {
    const result = { is_success: false, updated_count: 0 }
    try {
        const pool = getPool(locale)
        const connection = await pool.getConnection(async conn => conn);
        const [qResult] = await connection.query(query)
        connection.release()
        result.is_success = true
        result.updated_count = qResult.affectedRows
    } catch(err) {
        winston.debug(query.replaceAll('\n', ''))
        winston.error(`[MySQL Error: DELETE] ${err.message}` )
    }
    return result
}

module.exports = {
    select: selectQuery,
    insert: insertQuery,
    update: updateQuery,
    delete: deleteQuery
};