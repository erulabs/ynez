# Redistribute

A toolkit for building streaming real-time applications using Node.js, [Redis Streams](https://redis.io/topics/streams-intro), WebSockets and localStorage, which aims to dramatically reduce the amount of code and cash required to write reliable, distributed, real-time applications with no single points of failure.

Redistribute has two components, `redistribute`, the server package (a Node.js library), and `redistribute-client`, a browser and Node.js compatible client library,

An example will look quite a bit like an example for a standard WebSocket library, with a few key differences:

- Redistribute Streams are **distributed**; any other server (and their clients) which is subscribed to a channel will receive the message. No need for single points of failure, no need for vertically scaling a single Node.js instance, no need for the `cluster` module or other premature optimizations and complexities.

- Redistribute Streams are **replayable**; past messages can be re-read from the Redis stream after they have been originally sent (up to a configurable limit).

- Redistribute Streams are **shardable**; a fleet of worker machines can work together to handle messages in a stream via "Consumer Groups".

### Table of Contents

1. [Examples](#example)
2. [Messages](#messages)
3. [Server](#server)
    - [Redistribute()](#redistributeoptions)
    - [Server Events](#server-events)
    - [.listen()](#redistributelistenoptions)
    - [.publish()](#async-redistributepublishchannel-)
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

## Example

### Server Example

```js
const server = require('redistribute')({
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

### Client Example

```js
const client = require('redistribute-client')({
  targets: ['https://redistribute-api.demo:8080']
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

### Redistribute(options)

Where "options" is an object with the following properties:

| Option    | Required |     Default      | Description                               |
| :-------- | :------: | :--------------: | ----------------------------------------- |
| `targets` |   yes    |        -         | An array of Redis server URIs             |
| `encode`  |    no    | `JSON.stringify` | A function for encoding published objects |
| `decode`  |    no    |   `JSON.parse`   | A function for decoding published objects |

### Server Events

- **connect** - A new socket has connected
- **error** - An error has been encountered (connection to Redis failed, etc)

### Redistribute.listen(options)

Where "options" is an object with the following properties:

| Option |    type    | Required | Default | Description                                        |
| :----- | :--------: | :------: | :-----: | -------------------------------------------------- |
| `key`  | **string** |   yes    |    -    | Filepath to SSL key                                |
| `cert` | **string** |   yes    |    -    | Filepath to SSL certificate                        |
| `port` | **number** |    no    |  8080   | Port number to listen on for websocket connections |

### async Redistribute.publish(channel, ...)

Send data upstream to the Redis service. See Client.publish() for rules regarding option count rules.

```js
await server.publish('myChannel', 'some', 'data')
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
| `targets`      |   yes    |        -         | An array of Redistribute server URIs      |
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
await client.publish('test', 'foo', 'bar')
// Success! Returns with new message offset
await client.publish('test', 'foo')
// Error! Invalid argument count!
await client.publish('test', 'foo', { bar: "baz" })
// Note that object arguments are stringified automatically
await client.publish('test', 'foo', 'bar', 'baz', 'bam', 'words', 'things')
// Success! We can post as many key-value pairs as desired
```
