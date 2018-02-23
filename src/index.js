const {logger} = require('./logger')
const {onRequest} = require('./rabbit')
const {connect: connectToRedis} = require('./redis')

const {
  getTitle,
  getFilename,
  downloadVideo,
  downloadAudio
} = require('youtube-downloader-core');

(async () => {
  logger.log('info', 'connecting to redis')
  const redis = connectToRedis()
  logger.log('info', 'connected to redis')

  logger.log('debug', 'registering request handler')
  await onRequest(request => requestHandler(redis, request))
  logger.log('info', 'standing by for requests')
})()

const requestHandler = async (redis, {url, type}) => {
  logger.log('debug', 'cache lookup', {url})
  const cachedFilename = await redis.get(url)
  if (cachedFilename) {
    logger.log('info', 'cache hit', {url, cachedFilename})
    return
  }

  logger.log('debug', 'getting title and filename', {url})
  const [title, filename] = await Promise.all([getTitle(url), getFilename(url)])
  logger.log('info', 'title and filename', {url, title, filename})

  const download = type === 'audio' ? downloadAudio(url) : downloadVideo(url)
  download
    .on('error', error => logger.error(error))
    .on('state', state => logger.log('info', 'state has changed', {state}))
    .on('progress', progress => logger.log('debug', 'process has changed', {progress}))
    .on('complete', async () => {
      logger.log('info', 'download complete', {url})
      await redis.get(url, filename)
      logger.log('debug', 'persisting to cache', {url, filename})
    })
}
