module.exports = {
  logLevel: process.env.LOG_LEVEL || 'info',
  rabbit: {
    url: process.env.RABBIT_HOST === undefined ? 'amqp://localhost' : `amqp://${process.env.RABBIT_HOST}`,
    requestsQueueName: 'requests',
    responsesQueueName: 'responses',
    reconnectDelay: 3000
  }
}
