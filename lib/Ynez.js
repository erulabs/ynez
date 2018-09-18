// @flow

const Redis = require('ioredis')
const EventEmitter = require('events')

const { string: xadd } = Redis.prototype.createBuiltinCommand('xadd')
const { string: xread } = Redis.prototype.createBuiltinCommand('xread')
Redis.prototype.xadd = xadd
Redis.prototype.xread = xread

module.exports = class Ynez {
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
  subscriptions: {
    [string]: {
      subscribers: 0,
      offset: string
    }
  }
  redisEventEmitter: EventEmitter
  options: Object
  readRedis: Redis
  readRedisConnectionId: string
  readStreamActive: boolean
  writeRedis: Redis
  */

  constructor (
    redisUris /*: string */,
    optionsObj /*: {
      autoConnect?: boolean,
      redisOptions?: Object,
      blockingInterval?: number
    } */ = {}
  ) {
    this.subscriptions = {}
    this.connected = false
    this.readStreamActive = false
    this.redisEventEmitter = new EventEmitter()
    const defaultOptions = {
      autoConnect: true,
      blockingInterval: 1000
    }
    this.options = Object.assign({}, defaultOptions, optionsObj)
    if (this.options.autoConnect) {
      this.connect(redisUris)
    }
  }

  connect (redisUris /*: string */) {
    return new Promise((resolve, reject) => {
      const redisTarget = Ynez.sampleArray(Ynez.parseUris(redisUris))
      if (!redisTarget) {
        throw new Error(`No redis target provided!`)
      }
      const options = Object.assign(
        {
          host: redisTarget.host,
          port: redisTarget.port
        },
        this.options.redisOptions
      )

      const connectionName =
        new Date().getTime() + '-' + Math.floor(Math.random() * 100000)
      this.readRedis = new Redis(Object.assign({}, options, { connectionName }))
      this.readRedis.on('connect', () => {
        this.writeRedis = new Redis(options)
        this.writeRedis.on('connect', async () => {
          this.connected = true
          this.readRedisConnectionId = await this.readRedis.client('id')
          resolve()
        })
        this.writeRedis.on('close', () => {
          this.connected = false
        })
      })
      this.readRedis.on('close', () => {
        this.connected = false
      })
    })
  }

  async disconnect () {
    this.connected = false
    this.redisEventEmitter.removeAllListeners()
    this.subscriptions = {}
    if (this.readStreamActive) {
      await this.unblock()
    }
    await Promise.all([this.readRedis.quit(), this.writeRedis.quit()])
  }

  async unblock () {
    await this.writeRedis.client('unblock', this.readRedisConnectionId)
    this.readStreamActive = false
  }

  async readStream () {
    if (!this.connected) return
    if (this.readStreamActive) {
      await this.unblock()
    }
    this.readStreamActive = true
    const streamIds = []
    const streamOffsets = []
    for (const id in this.subscriptions) {
      const sub = this.subscriptions[id]
      if (sub.subscribers > 0) {
        streamIds.push(id)
        streamOffsets.push(sub.offset)
      }
    }
    if (streamIds.length > 0) {
      const messages = await this.readRedis.xread(
        'BLOCK',
        this.options.blockingInterval,
        'STREAMS',
        ...streamIds,
        ...streamOffsets
      )
      this.readStreamActive = false
      if (!this.connected) return
      if (messages) {
        for (let i = 0; i < messages.length; i++) {
          const newEventId = messages[i][0]
          if (this.subscriptions[newEventId]) {
            const eventMessagesRaw = messages[i][1]
            const eventMessages = eventMessagesRaw.map(r => {
              r[1][1] = JSON.parse(r[1][1])
              return r
            })
            this.subscriptions[newEventId].offset =
              eventMessages[eventMessages.length - 1][0]
            this.redisEventEmitter.emit(newEventId, eventMessages)
          }
        }
      }
      await this.readStream()
    } else {
      // No streamIds - everyone unsubscribed? No need to keep reading at all!
    }
  }

  subscribe (
    eventId /*: string */,
    offset /*: string */,
    onEvent /*: Function */
  ) {
    if (!this.subscriptions[eventId]) {
      this.subscriptions[eventId] = {
        subscribers: 1,
        offset
      }
      this.readStream()
    } else {
      this.subscriptions[eventId].subscribers += 1
    }
    this.redisEventEmitter.on(eventId, onEvent)

    return this
  }

  unsubscribe (eventId /*: string */, onEvent /*: Function */) {
    if (this.subscriptions[eventId]) {
      if (this.subscriptions[eventId].subscribers > 0) {
        this.redisEventEmitter.removeListener(eventId, onEvent)
        this.subscriptions[eventId].subscribers -= 1
      }
      if (this.subscriptions[eventId].subscribers === 0) {
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
    if (!this.connected) return
    const resp = await this.writeRedis.xadd(
      eventId,
      messageId,
      type,
      typeof content === 'object' ? JSON.stringify(content) : content
    )
    return resp
  }
}
