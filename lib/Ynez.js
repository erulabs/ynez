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
  subscriptions: Object
  redisEventEmitter: EventEmitter
  options: Object
  readRedis: Redis
  readRedisConnectionId: string
  readStreamActive: boolean
  writeRedis: Redis
  connected: boolean
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
    this.connected = false
    this.readStreamActive = false
    this.redisEventEmitter = new EventEmitter()
    const defaultOptions = {
      autoConnect: true,
      blockingInterval: 20000
    }
    this.options = Object.assign({}, defaultOptions, optionsObj)
    if (this.options.autoConnect) {
      this.connect(redisUris)
    }
  }

  connect (redisUris /*: string */ = process.env.REDIS_URIS || '') {
    return new Promise((resolve, reject) => {
      const redisTarget = Ynez.sampleArray(
        Ynez.parseUris(process.env.REDIS_URIS)
      )
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
          const listRaw = await this.writeRedis.client('list')
          listRaw.split('\n').map(line => {
            const re = new RegExp(`name=${connectionName}`, 'g')
            if (line.match(re)) {
              const id = line.match(/^id=(\d+)/)
              if (id[1]) {
                this.readRedisConnectionId = id[1]
                resolve()
              }
            }
          })
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

  async readStream (streamsArr /*: Array<Array<string>> */) {
    const streamsArrRemaining = []
    if (!this.connected) return
    if (this.readStreamActive) {
      await this.unblock()
    }
    this.readStreamActive = true
    console.log('xread', streamsArr)
    const messages = await this.readRedis.xread(
      'BLOCK',
      this.options.blockingInterval,
      'STREAMS',
      streamsArr.map(s => s[0]),
      streamsArr.map(s => s[1])
    )
    this.readStreamActive = false
    if (!this.connected) return
    if (messages) {
      for (let i = 0; i < messages.length; i++) {
        const newEventId = messages[i][0]
        const eventMessagesRaw = messages[i][1]
        const eventMessages = eventMessagesRaw.map(r => {
          r[1][1] = JSON.parse(r[1][1])
          return r
        })
        streamsArr.map(s => {
          if (s[0] === newEventId) {
            s[1] = eventMessages[eventMessages.length - 1][0]
          }
          if (
            this.subscriptions[newEventId] &&
            this.subscriptions[newEventId] > 0
          ) {
            streamsArrRemaining.push(s)
            this.redisEventEmitter.emit(newEventId, eventMessages)
          }
        })
      }
    }
    if (this.readStreamActive === false && streamsArrRemaining.length > 0) {
      await this.readStream(streamsArrRemaining)
    }
  }

  subscribe (
    eventId /*: string */,
    lastSeen /*: string */,
    onEvent /*: Function */
  ) {
    if (!this.subscriptions[eventId]) {
      this.subscriptions[eventId] = 1
      this.readStream([[eventId, lastSeen]])
    } else {
      this.subscriptions[eventId] += 1
    }
    this.redisEventEmitter.on(eventId, onEvent)

    return this
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
