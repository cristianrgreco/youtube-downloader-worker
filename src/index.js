const redis = require('redis')
const amqplib = require('amqplib')
const {promisify} = require('util')
const conf = require('./conf')
const {logger} = require('./logger')

const {
  getTitle,
  getFilename,
  downloadVideo,
  downloadAudio
} = require('youtube-downloader-core')

const connectToRedis = () => {
  const {redis: {host, port, password}} = conf
  logger.info('connecting to redis', {host, port, password})

  const client = redis.createClient(port, host)
  if (password) {
    client.auth(password)
  }

  return {
    get: promisify(client.get).bind(client),
    set: promisify(client.set).bind(client)
  }
}

const connectToRabbit = async () => {
  const {rabbit: {url, reconnectDelay}} = conf
  logger.info('connecting to rabbit', {url})

  return new Promise(resolve => {
    const connect = async (attempt = 1) => {
      try {
        logger.debug('connecting to rabbit', {attempt})
        resolve(await amqplib.connect(url))
      } catch (e) {
        setTimeout(() => connect(attempt + 1), reconnectDelay)
      }
    }
    return connect()
  })
}

const consumeRequests = async (rabbit, redis) => {
  const requestsChannel = await rabbit.createChannel()
  const requestsQueue = 'requests'

  requestsChannel.assertQueue(requestsQueue, {durable: true})
  requestsChannel.prefetch(1)

  requestsChannel.consume(requestsQueue, async message => {
    const {url, type} = JSON.parse(message.content.toString())
    logger.info('request received', {url, type})

    await publishResponses(rabbit, redis, {message, requestsChannel}, {url, type})
  })
}

const publishCachedResponse = (key, cachedResponse, responseChannel, responseExchange, {url, type}) => {
  logger.info('request resolved from cache', {request: {url, type}, cachedResponse})

  responseChannel.publish(
    responseExchange,
    key,
    Buffer.from(JSON.stringify({key, type: 'TITLE', payload: cachedResponse.title}))
  )
  responseChannel.publish(
    responseExchange,
    key,
    Buffer.from(JSON.stringify({key, type: 'STATE', payload: {id: 4, text: 'COMPLETE'}}))
  )
  responseChannel.publish(
    responseExchange,
    key,
    Buffer.from(JSON.stringify({key, type: 'PROGRESS', payload: {percentageComplete: '100%'}}))
  )
}

const publishResponses = async (rabbit, redis, {message, requestsChannel}, {url, type}) => {
  const responseChannel = await rabbit.createChannel()
  const responseExchange = 'responses'
  const key = `${Buffer.from(url).toString('base64')}.${type}`

  logger.debug('querying cache', {key})
  const cached = await redis.get(key)

  if (cached) {
    const cachedResponse = JSON.parse(cached)
    logger.info('request resolved from cache', {url, cachedValue: cachedResponse})

    publishCachedResponse(key, cachedResponse, responseChannel, responseExchange, {url, type})
    requestsChannel.ack(message)

    return
  }

  responseChannel.assertExchange(responseExchange, 'topic', {durable: false})

  const title = await getTitle(url)
  responseChannel.publish(
    responseExchange,
    key,
    Buffer.from(JSON.stringify({key, type: 'TITLE', payload: title}))
  )

  const filename = await getFilename(url)
  logger.info('request resolved', {url, filename})

  const download = type === 'AUDIO' ? downloadAudio(url) : downloadVideo(url)
  download
    .on('state', state => {
      responseChannel.publish(
        responseExchange,
        key,
        Buffer.from(JSON.stringify({key, type: 'STATE', payload: state}))
      )
    })
    .on('progress', progress => {
      responseChannel.publish(
        responseExchange,
        key,
        Buffer.from(JSON.stringify({key, type: 'PROGRESS', payload: progress}))
      )
    })
    .on('complete', async () => {
      const cachedValue = {title, filename}
      logger.debug('persisting to cache', {key, value: cachedValue})
      await redis.set(key, JSON.stringify(cachedValue))

      requestsChannel.ack(message)
    })
}

(async () => {
  const redis = await connectToRedis()
  const rabbit = await connectToRabbit()

  await consumeRequests(rabbit, redis)

  logger.info('ready')
})()
