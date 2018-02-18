module.exports = {
  logLevel: process.env.LOG_LEVEL || 'info',
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  },
  rabbit: {
    url: process.env.RABBIT_HOST === undefined ? 'amqp://localhost' : `amqp://${process.env.RABBIT_HOST}`,
    requestsQueueName: 'requests',
    responsesQueueName: 'responses',
    reconnectDelay: 3000
  }
}
