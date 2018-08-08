
<div align="center">
  <img width="358" height="178" src="https://i.imgur.com/Itz2BNB.jpg">
  <br />
  <h2>Distributed and replayable streams</h2>

  Build reliable, real-time applications with JavaScript and Redis faster than ever before
  <br /><br />
  <a href="https://npm.runkit.com/ynez"><img src="https://img.shields.io/npm/v/ynez.svg?style=for-the-badge" /></a>
  <a href="https://circleci.com/gh/erulabs/ynez"><img src="https://img.shields.io/circleci/project/github/erulabs/Ynez.svg?style=for-the-badge" /></a>
  <img src="https://img.shields.io/npm/dt/ynez.svg?style=for-the-badge" />
  <br /><br />
  <img src="https://img.shields.io/github/release-date/SubtitleEdit/subtitleedit.svg?style=for-the-badge" />
  <img src="https://img.shields.io/npm/l/ynez.svg?style=for-the-badge" />
  <br /><br />
</div>


**Ynez** is a toolkit for building streaming real-time applications using Node.js, [Redis Streams](https://redis.io/topics/streams-intro), WebSockets and localStorage, which aims to dramatically reduce the amount of code and cash required to write reliable, distributed, real-time applications with no single points of failure. It is named after the [Santa Ynez River](https://en.wikipedia.org/wiki/Santa_Ynez_River), where [I](https://erulabs.com) grew up, which both feeds and is fed by many smaller creeks and streams.

Ynez has two components:

`ynez`, the server package, hosts a websocket server and connects to a Redis server supporting the new [Streams](https://redis.io/topics/streams-intro) feature.

and

`ynez-client`, a browser and Node.js compatible client library, which connects to a `ynez` server via websocket.

### Table of Contents

0. [About](#about)
1. [Examples](#example)
2. [Messages](#messages)
3. [Server](#server)
    - [Ynez()](#ynezoptions)
    - [Server Events](#server-events)
    - [.listen()](#serverlistenoptions)
    - [.connect()](#serverlistenoptions)
    - [.publish()](#async-serverpublishchannel-)
    - [Socket Events](#socket-events)
    - [Socket.subscribe()](#socketsubscribechannel-offset)
    - [Socket.unsubscribe()](#socketunsubscribechannel)
    - [Socket.emit()](#socketemitchannel-messages)
4. [Client](#client)
    - [Client()](#clientoptions)
    - [Client Events](#client-events)
    - [.load()](#async-clientloadchannel)
    - [.subscribe()](#async-clientsubscribechannel-offset)
    - [.unsubscribe()](#async-clientunsubscribechannel)
    - [.publish()](#async-clientpublishchannel-)

## About

Ynez is powered by brand new features in the Redis Database - Streams! You should read the [original blog post](http://antirez.com/news/114) and the [official Redis docs](https://redis.io/topics/streams-intro). Ynez uses [XREAD](https://redis.io/commands/xread) and [XADD](https://redis.io/commands/xadd) to read and write to Redis Streams, and exposes an API that allows easy creation of real-time WebSocket services.

We also make use of the `UNBLOCK CLIENT` syntax which has only (as of writing) just landed in Redis unstable. The `erulabs/redis-unstable` docker image is an easy way to get started.

An example will look quite a bit like an example for a standard WebSocket library, with a few key differences:

- Ynez Servers are **stateless**; the state of the stream exists in Redis, not Node.js - if an instance crashes or a user reconnects to a different instance, no state is lost and the user sees no difference! Deploy socket based applications without state concerns!

- Ynez Streams are **distributed**; any other server (and their clients) which is subscribed to a channel will receive the messages. No need for the `cluster` module or other premature optimizations and complexities. Optionally add Redis Cluster for a [zero SPOF](https://en.wikipedia.org/wiki/Single_point_of_failure) infrastructure!

- Ynez Streams are **replayable**; past messages can be re-read from the Redis stream after they have been originally sent (up to a configurable limit).

- Ynez Streams are **persistent**-ish; Messages can be sent before any clients are listening, to be collected at a later point, and clients can easily store messages in localStorage for later replay. Streams also have a configurable maximum length, after which messages can be forgotten.

## Example

### Server

```js
const Ynez = require('ynez')
const server = new Ynez({
  targets: ['localhost:6379', 'another-server:6379']
})
// Hoist a websocket server
server.listen({
  key: '...',
  cert: '...',
  port: 8080
})
// Handle subscription requests from users
server.on('connect', socket => {
  socket.on('subscribe', (channel, offset) => {
    // Subscribe to messages from upstream
    // Note that calling `subscribe()` twice on the same channel has no effect
    socket.subscribe(channel, offset)
    // Forward some or all messages down to clients
  })
  socket.on('messages', (channel, messages)) => {
    socket.emit(channel, messages)
  })
  // Handle message publishing events from users
  socket.on('publish', (channel, message) => {
    // Validate / Audit messages from users, then pass them upstream!
    server.publish(channel, message)
  })
})
```

### Client

```js
const client = require('ynez-client')({
  targets: ['https://ynez-api.demo:8080']
})
// Load locally stored messages
client.load('myTestChannel').then((messages, lastOffset) => {
  // Subscribe to a channel with an optional offset
  client.subscribe('myTestChannel', lastOffset)
}))
client.on('messages', messages => {
  // Do stuff with messages!
})
// Ship messages to the server!
client.publish('myTestChannel', 'TEST_MESSAGE', { foo: 'bar' })
```

## API Documentation

## Messages

Messages events provide arrays of "Message" objects, which have the following properties:

```js
const Message = {
  offset: string,
  key: value,
  key2: value2...
}
```

For example, consider the following:

```js
// Server
socket.emit('testChannel', 'TEST_MESSAGE', { foo: 'bar' })

// Client
client.on('messages', (channel, messages) => {
  // channel === "testChannel"
  // messages === [
  //  {
  //    offset: "1518951480106-0",
  //    TEST_MESSAGE: { foo: 'bar' } }
  // ]
})
```

## Server

### Ynez(options)

Where "options" is an object with the following properties:

| Option        | Required |     Default        | Description                               |
| :------------ | :------: | :--------------:   | ----------------------------------------- |
| `targets`     |    no    | `["localhost:6379"]` | An array of Redis server URIs             |
| `autoConnect` |    no    | true               | Calls `.connect()` on construction (connects to Redis) |
| `encode`      |    no    | `JSON.stringify`   | A function for encoding published objects |
| `decode`      |    no    |   `JSON.parse`     | A function for decoding published objects |

```js
const server = new Ynez({ autoConnect: false })
```

### Server Events

- **ready** - Connected to Redis
- **connect** - A new socket has connected
- **error** - An error has been encountered (connection to Redis failed, etc)

### Server.listen(options)

Where "options" is an object with the following properties:

| Option |    type    | Required | Default | Description                                        |
| :----- | :--------: | :------: | :-----: | -------------------------------------------------- |
| `key`  | **string** |   yes    |    -    | Filepath to SSL key                                |
| `cert` | **string** |   yes    |    -    | Filepath to SSL certificate                        |
| `port` | **number** |    no    |  8080   | Port number to listen on for websocket connections |

```js
const server = new Ynez({ autoConnect: false })
```

### Server.connect()

Connects to redis - Is called automatically if `autoConnect` (on the Ynez constructor) is false.

### async Server.publish(channel, ...)

Send data upstream to the Redis service. Like [Client.publish()](#async-clientpublishchannel-), this follows the rules of XADD. The number of arguments after the `channel` must be even, and objects will be encoded automatically.

```js
await server.publish('myChannel', 'some', { foo: 'data' })
// returns with locally loaded messages and most recent offset
```

### Socket Events

- **disconnect** - A socket has disconnected
- **subscribe** - A socket has requested a subscription to a channel
- **unsubscribe** - A socket no long wants messages from a channel
- **publish** - A socket has a message to publish for a channel
- **messages** - Messages have arrived from a subscribed channel

### Socket.subscribe(channel, offset)

| Argument  |    type    | Required | Default | Description            |
| :-------- | :--------: | :------: | :-----: | ---------------------- |
| `channel` | **string** |   yes    |    -    | Channel identifier key |
| `offset`  | **string** |    no    |   `$`   | Redis stream offset    |

### Socket.unsubscribe(channel)

Unsubscribes a socket from a given channel. This is called automatically when a socket disconnects, if there is no existing `disconnect` handler defined.

| Argument  |    type    | Required | Default | Description                 |
| :-------- | :--------: | :------: | :-----: | --------------------------- |
| `channel` | **string** |   yes    |    -    | Channel to unsubscribe from |

### Socket.emit(channel, messages)

Send data to a connected socket

## Client

### Client(options)

Where "options" is an object with the following properties:

| Option         | Required |     Default      | Description                               |
| :------------- | :------: | :--------------: | ----------------------------------------- |
| `targets`      |   yes    |        -         | An array of Ynez server URIs      |
| `encode`       |    no    | `JSON.stringify` | A function for encoding published objects |
| `decode`       |    no    |   `JSON.parse`   | A function for decoding published objects |
| `localStorage` |    no    |       true       | Automatically store retrieved messages    |

### Client Events

- **connect** - Socket is connected to the server
- **disconnect** - Socket has been disconnected from the server
- **messages** - Messages have arrived from a subscribed channel
- **error** - An error has been received from the server

### async Client.load(channel)

| Argument  |    type    | Required | Default | Description                                |
| :-------- | :--------: | :------: | :-----: | ------------------------------------------ |
| `channel` | **string** |   yes    |    -    | Channel to load locally stored message for |

```js
const { messages, lastOffset } = await client.load('myChannel')
// returns with locally loaded messages and most recent offset
```

### async Client.subscribe(channel, offset)

| Argument  |    type    | Required | Default | Description                                |
| :-------- | :--------: | :------: | :-----: | ------------------------------------------ |
| `channel` | **string** |   yes    |    -    | Channel to load locally stored message for |
| `offset`  | **string** |    no    |   `$`   | Redis stream offset                        |

```js
await client.subscribe('myChannel')
// returns true if subscribe message sent successfully
```

### async Client.unsubscribe(channel)

| Argument  |    type    | Required | Default | Description                 |
| :-------- | :--------: | :------: | :-----: | --------------------------- |
| `channel` | **string** |   yes    |    -    | Channel to unsubscribe from |

```js
await client.unsubscribe('myChannel')
// returns true if unsubscribe message sent successfully
```

### async Client.publish(channel, ...)

| Argument  |    type    | Required | Default | Description                    |
| :-------- | :--------: | :------: | :-----: | ------------------------------ |
| `channel` | **string** |   yes    |    -    | Channel to publish messages to |

The rest of the arguments are considered key-value pairs, to be used during the Redis Stream XADD. This means that the number of arguments after `channel` must be an even number. For example:

```js
// Examples of Client Publish
await client.publish('test', 'foo', 'bar') // Success! Returns with new message offset
await client.publish('test', 'foo') // Error! Invalid argument count!
await client.publish('test', 'foo', { bar: "baz" }) // Note that object arguments are stringified automatically
await client.publish('test', 'foo', 'bar', 'baz', 'bam', 'words', 'things') // Success!
```


## Internal subsciption model

Each Ynez server has a single list of channels to be subscribed to.
