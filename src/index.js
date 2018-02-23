const redis = require('redis')
const {promisify} = require('util')
const {logger} = require('./logger')
const conf = require('./conf')
const {onRequest} = require('./rabbit')

const {
  getTitle,
  getFilename,
  downloadVideo,
  downloadAudio
} = require('youtube-downloader-core');

(async () => {
  const {host: redisHost, port: redisPort, password: redisPassword} = conf.redis
  logger.log('info', 'connecting to redis', {host: redisHost, port: redisPort, pass: redisPassword})

  const redisClient = redis.createClient(conf.redis.port, conf.redis.host)
  if (redisPassword) {
    redisClient.auth(redisPassword)
  }
  logger.log('info', 'connected to redis')

  const redisGet = promisify(redisClient.get).bind(redisClient)
  const redisSet = promisify(redisClient.set).bind(redisClient)

  logger.log('info', 'standing by for requests')
  await onRequest(async ({url, type}) => {
    logger.log('debug', 'cache lookup', {url})
    const cachedFilename = await redisGet(url)
    if (cachedFilename) {
      logger.log('info', 'cache hit', {url, cachedFilename})
      return
    }

    logger.log('debug', 'getting title and filename', {url})
    const [title, filename] = await Promise.all([getTitle(url), getFilename(url)])
    logger.log('info', 'title and filename', {url, title, filename})

    const download = type === 'audio' ? downloadAudio(url) : downloadVideo(url)
    download
      .on('state', state => logger.debug(state))
      .on('progress', progress => logger.debug(progress))
      .on('complete', async () => {
        logger.log('info', 'download complete', {url})
        await redisSet(url, filename)
        logger.log('debug', 'persisting to cache', {url, filename})
      })
      .on('error', error => logger.error(error))
  })
})()
