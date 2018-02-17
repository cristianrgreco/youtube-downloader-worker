const {logger} = require('./logger')
const {onRequest} = require('./rabbit');

(async () => {
  logger.info('connecting to rabbit')

  await onRequest(requestUrl => {
    logger.info(`handle requestUrl here: ${requestUrl}`)
  })
})()
