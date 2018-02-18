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

  await onRequest(async ({url, type}) => {
    logger.debug(`querying cache for ${url}`)
    const cachedFilename = await redisGet(url)
    if (cachedFilename) {
      logger.info(`cache hit for ${url}: ${cachedFilename}`)
      return
    }

    logger.debug(`getting title for ${url}`)
    const title = await getTitle(url)
    logger.info(`title for ${url} is ${title}`)

    logger.debug(`getting filename for ${url}`)
    const filename = await getFilename(url)
    logger.info(`filename for ${url} is ${filename}`)

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
