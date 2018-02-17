const winston = require('winston')
const {logLevel} = require('./conf')

const logger = winston.createLogger({
  level: logLevel,
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'combined.log' })
  ]
})

module.exports = {
  logger
}
