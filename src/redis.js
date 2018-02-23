const redis = require('redis')
const {promisify} = require('util')
const {logger} = require('./logger')
const {redis: {host, port, password}} = require('./conf')

const connect = () => {
  logger.log('debug', 'connecting to redis', {host, port, password})

  const client = redis.createClient(port, host)
  if (password) {
    client.auth(password)
  }

  logger.log('debug', 'connected to redis')

  const get = promisify(client.get).bind(client)
  const set = promisify(client.set).bind(client)

  return {
    get,
    set
  }
}

module.exports = {
  connect
}
