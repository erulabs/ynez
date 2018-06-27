// @flow

const Redis = require('ioredis')
const genericPool = require('generic-pool')
const EventEmitter = require('events')

const { string: xadd } = Redis.prototype.createBuiltinCommand('xadd')
const { string: xread } = Redis.prototype.createBuiltinCommand('xread')
Redis.prototype.xadd = xadd
Redis.prototype.xread = xread

module.exports = class Redistribute {
  // Parses a string of URIs like: "host:port,host:port..."
  // into an array of objects like: [ { host: "host", port: "port" }]
  static parseUris (
    urisStr /*: any */
  ) /*: Array<{ host: string, port: number }> */ {
    if (typeof urisStr !== 'string') return []
    const uris = urisStr.split(',')
    const out = []
    for (let i = 0; i < uris.length; i++) {
      const [host, port] = uris[i].split(':')
      out.push({ host, port: parseInt(port, 10) })
    }
    return out
  }
  static sampleArray (arr /*: Array<any> */) {
    if (!arr || !arr.length) return undefined
    return arr[Math.floor(Math.random() * arr.length)]
  }

  /* flow-include
  pool: Object
  subscriptions: Object
  redisEventEmitter: EventEmitter
  options: Object
  */

  constructor (
    redisUris /*: string */ = process.env.REDIS_URIS || '',
    optionsObj /*: {
      autoConnect?: boolean,
      redisOptions?: Object,
      blockingInterval?: number
    } */ = {}
  ) {
    this.subscriptions = {}
    this.redisEventEmitter = new EventEmitter()
    const defaultOptions = {
      autoConnect: true,
      blockingInterval: 5000
    }
    this.options = Object.assign({}, defaultOptions, optionsObj)
    if (this.options.autoConnect) {
      this.connect(
        redisUris,
        this.options.redisOptions
      )
    }
  }

  async connect (
    redisUris /*: string */ = process.env.REDIS_URIS || '',
    redisOptions /*: ?Object */
  ) {
    if (this.pool) return
    this.pool = genericPool.createPool(
      {
        create: () => {
          const redisTarget = Redistribute.sampleArray(
            Redistribute.parseUris(process.env.REDIS_URIS)
          )
          if (redisTarget) {
            return new Redis({
              host: redisTarget.host,
              port: redisTarget.port
            })
          }
        },
        destroy: client => {
          client.disconnect()
        }
      },
      {
        max: 10,
        min: 0
      }
    )
    return this.pool
  }

  async disconnect () {
    if (!this.pool) return
    this.redisEventEmitter.removeAllListeners()
    this.subscriptions = {}
    await this.pool.drain()
    await this.pool.clear()
    delete this.pool
  }

  async readStream (eventId /*: string */, lastSeen /*: string */ = '$') {
    if (!this.pool) {
      throw new Error('Cannot call subscribe() before calling connect()')
    }
    const redis = await this.pool.acquire()
    const messages = await redis.xread(
      'BLOCK',
      this.options.blockingInterval,
      'STREAMS',
      eventId,
      lastSeen
    )
    if (messages) {
      for (let i = 0; i < messages.length; i++) {
        const newEventId = messages[i][0]
        const eventMessages = messages[i][1]
        this.redisEventEmitter.emit(newEventId, eventMessages)
        lastSeen = eventMessages[eventMessages.length - 1][0]
      }
    }
    if (this.subscriptions[eventId] && this.subscriptions[eventId] > 0) {
      await this.readStream(eventId, lastSeen)
    }
    if (this.pool) {
      await this.pool.release(redis)
    }
  }

  subscribe (
    eventId /*: string */,
    lastSeen /*: string */,
    onEvent /*: Function */
  ) {
    if (!this.subscriptions[eventId]) {
      this.subscriptions[eventId] = 1
      this.readStream(eventId, lastSeen)
    } else {
      this.subscriptions[eventId] += 1
    }
    this.redisEventEmitter.on(eventId, onEvent)
  }

  unsubscribe (eventId /*: string */, onEvent /*: Function */) {
    if (this.subscriptions[eventId]) {
      if (this.subscriptions[eventId] > 0) {
        this.redisEventEmitter.removeListener(eventId, onEvent)
        this.subscriptions[eventId] -= 1
      }
      if (this.subscriptions[eventId] === 0) {
        delete this.subscriptions[eventId]
      }
    }
  }

  async add (
    eventId /*: string */,
    type /*: string */,
    content /*: Object */,
    messageId /*: string */ = '*'
  ) {
    if (!this.pool) {
      throw new Error('Cannot call publish() before calling connect()')
    }
    const redis = await this.pool.acquire()
    const resp = await redis.xadd(
      eventId,
      messageId,
      type,
      `'${JSON.stringify(content)}'`
    )
    await this.pool.release(redis)
    return resp
  }
}
