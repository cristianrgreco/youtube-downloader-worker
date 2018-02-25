const {
  LOG_LEVEL,
  REDIS_HOST,
  REDIS_PORT,
  REDIS_PASS,
  RABBIT_HOST,
  RABBIT_PORT,
  RABBIT_USER,
  RABBIT_PASS
} = process.env

module.exports = {
  logLevel: LOG_LEVEL || 'info',
  redis: {
    host: REDIS_HOST || 'localhost',
    port: REDIS_PORT || 6379,
    password: REDIS_PASS || null
  },
  rabbit: {
    url: RABBIT_HOST === undefined
      ? 'amqp://localhost'
      : `amqp://${RABBIT_USER}:${RABBIT_PASS}@${RABBIT_HOST}:${RABBIT_PORT}`,
    reconnectDelay: 3000
  }
}
