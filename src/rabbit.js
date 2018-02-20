const amqplib = require('amqplib')
const {logger} = require('./logger')
const {rabbit: {url, requestsQueueName, reconnectDelay}} = require('./conf')

const createRequestsChannel = () => createChannel(requestsQueueName)

const createChannel = queueName => new Promise(async resolve => {
  const attempt = async (attempts = 1) => {
    try {
      logger.debug(`attempting to connect to rabbit on: ${queueName} #${attempts}: ${url}`)
      const connection = await amqplib.connect(url)
      const channel = await connection.createChannel()
      await channel.assertQueue(queueName, {durable: false, autoDelete: true})
      logger.debug(`connected to rabbit on queue ${queueName}`)
      return resolve(channel)
    } catch (e) {
      setTimeout(() => attempt(attempts + 1), reconnectDelay)
    }
  }
  return attempt()
})

const onRequest = async handler => {
  const channel = await createRequestsChannel()
  await channel.consume(requestsQueueName, async message => {
    const payload = message.content.toString()
    logger.debug(`request received: ${payload}`)
    await handler(JSON.parse(payload))
    channel.ack(message)
  })
}

module.exports = {
  onRequest
}
