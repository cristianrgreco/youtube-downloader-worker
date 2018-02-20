const {
  getTitle,
  getFilename,
  downloadVideo,
  downloadAudio
} = require('youtube-downloader-core')

const redis = require('redis')
const {promisify} = require('util')
const {logger} = require('./logger')
const conf = require('./conf')
const {onRequest} = require('./rabbit');

(async () => {
  logger.info('connecting to redis')
  const redisClient = redis.createClient(conf.redis.port, conf.redis.host)
  const redisGet = promisify(redisClient.get).bind(redisClient)
  const redisSet = promisify(redisClient.set).bind(redisClient)

  logger.info('waiting for requests')
  await onRequest(async ({url, type}) => {
    logger.debug(`cache lookup for: ${url}`)
    const cachedFilename = await redisGet(url)
    if (cachedFilename) {
      logger.info(`cache hit for: ${url}: ${cachedFilename}`)
      return
    }

    logger.debug(`getting title and filename for: ${url}`)
    const [title, filename] = await Promise.all([getTitle(url), getFilename(url)])
    logger.info(`title and filename for ${url}: ${title}, ${filename}`)

    const download = type === 'audio' ? downloadAudio(url) : downloadVideo(url)
    download
      .on('state', state => logger.debug(state))
      .on('progress', progress => logger.debug(progress))
      .on('complete', async () => {
        logger.info(`download complete for ${url}`)
        await redisSet(url, filename)
        logger.debug(`caching ${url}`)
      })
      .on('error', error => logger.error(error))
  })
})()
