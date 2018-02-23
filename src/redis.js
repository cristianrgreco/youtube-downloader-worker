const redis = require('redis')
const {promisify} = require('util')
const {logger} = require('./logger')
const {redis: {host, port, password}} = require('./conf')

const connect = () => {
  logger.log('info', 'connecting to redis', {host, port, password})

  const redisClient = redis.createClient(port, host)
  if (password) {
    redisClient.auth(password)
  }

  logger.log('info', 'connected to redis')

  const get = promisify(redisClient.get).bind(redisClient)
  const set = promisify(redisClient.set).bind(redisClient)

  return {
    get,
    set
  }
}

module.exports = {
  connect
}
