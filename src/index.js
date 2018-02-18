const {
  getTitle,
  getFilename,
  downloadVideo,
  downloadAudio
} = require('youtube-downloader-core')

const {logger} = require('./logger')
const {onRequest} = require('./rabbit');

(async () => {
  logger.info('connecting to rabbit')

  await onRequest(async ({url, type}) => {
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
      .on('complete', () => logger.info(`download complete for ${url}`))
      .on('error', error => logger.error(error))
  })
})()
