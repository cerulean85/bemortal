const schema = {
    result: {
        is_success: false,
        error_code: 200,
        error_message: '정상적으로 처리되었습니다.'
    },
    clone: (o) => { return JSON.parse(JSON.stringify(o)) }
}

module.exports = {  
    getResult: () => { return schema.clone(schema.result) },        
    serialize: (o) => { return JSON.stringify(o) }
}
