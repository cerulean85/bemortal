const appRoot = require('app-root-path')
const winston = require('winston')
require('winston-daily-rotate-file')
const logDir = `${appRoot}/logs`
const level = () => {
  const env = process.env.NODE_NV || 'development'
  const isDevelopment = env === 'development'
  return isDevelopment ? 'debug' : 'warn'
}

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
}

winston.addColors(colors)

const console = winston.createLogger({
  level: level(),
  transports: [
      new winston.transports.DailyRotateFile({
          level: 'info',
          datePattern: 'YYYY-MM-DD',
          dirname: logDir,
          json: true,
          filename: `%DATE%.log`,
          zippedArchive: true,	
          handleExceptions: true,
          maxFiles: 30,  
          format: winston.format.combine(
            winston.format.timestamp({ format: ' YYYY-MM-DD HH:MM:SS || '}),
            winston.format.colorize({ all: false }),
            winston.format.printf(
              (data) => `${data.timestamp} [ ${data.level} ] ▶ ${JSON.stringify(data.message, null, '\t')}`,
            )
          )
      }),
      new winston.transports.DailyRotateFile({
          level: 'error',
          datePattern: 'YYYY-MM-DD',
          dirname: logDir + '/error',  
          filename: `%DATE%.error.log`,
          zippedArchive: true,
          json: true,
          maxFiles: 30,
          format: winston.format.combine(
            winston.format.timestamp({ format: ' YYYY-MM-DD HH:MM:SS || '}),
            winston.format.colorize({ all: false }),
            winston.format.printf(
              (data) => `${data.timestamp} [ ${data.level} ] ▶ ${JSON.stringify(data.message, null)}`,
            )
          )
      }),
      new winston.transports.Console({
          handleExceptions: true,
          format: winston.format.combine(
            winston.format.timestamp({ format: ' YYYY-MM-DD HH:MM:SS || '}),
            winston.format.colorize({ all: false }),
            winston.format.printf(
              (data) => `${data.timestamp} [ ${data.level} ] ▶ ${JSON.stringify(data.message, null, '\t')}`,
            )
          )
      })
  ]
});

module.exports = console