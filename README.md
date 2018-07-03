# Redistribute

A toolkit for building streaming real-time applications using Node.js, [Redis Streams](https://redis.io/topics/streams-intro), WebSockets and localStorage, which aims to dramatically reduce the amount of code and cash required to write reliable, distributed, real-time applications with no single points of failure.

Redistribute has two components, `redistribute`, the server package (a Node.js library), and `redistribute-client`, a browser and Node.js compatible client library,

An example will look quite a bit like an example for a standard WebSocket library, with a few key differences:

- Redistribute Streams are **distributed**; any other server (and their clients) which is subscribed to a channel will receive the message. No need for single points of failure, no need for vertically scaling a single Node.js instance, no need for the `cluster` module or other premature optimizations and complexities.

- Redistribute Streams are **replayable**; past messages can be re-read from the Redis stream after they have been originally sent (up to a configurable limit).

- Redistribute Streams are **shardable**; a fleet of worker machines can work together to handle messages in a queue via Redis Stream "Consumer Groups".

Let's look at an example:

### Server

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
    socket.subscribe(channel, offset, messages => {
      // Broadcast messages to all subscribed clients
      socket.emit(messages)
    })
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
const client = require('redistribute-client')({
  targets: ['https://redistribute-api.demo:8080']
})
// Load locally stored messages
client.load('myTestChannel', (messages, lastOffset) => {
  // Subscribe to a channel with an optional offset
  client.subscribe('myTestChannel', lastOffset, messages => {
    // Do stuff with messages!
  })
})
// Ship messages to the server!
client.publish('myTestChannel', 'TEST_MESSAGE', { foo: 'bar' })
```

## API Documentation

## Server

### Redistribute(options)

Where "options" is an object with the following properties:

| Option    | Required | Default | Description                   |
| :-------- | :------: | :-----: | ----------------------------- |
| `targets` |   yes    |    -    | An array of Redis server URIs |

### Redistribute.listen(options)

Where "options" is an object with the following properties:

| Option |    type    | Required | Default | Description                                        |
| :----- | :--------: | :------: | :-----: | -------------------------------------------------- |
| `key`  | **string** |   yes    |    -    | Filepath to SSL key                                |
| `cert` | **string** |   yes    |    -    | Filepath to SSL certificate                        |
| `port` | **number** |    no    |  8080   | Port number to listen on for websocket connections |

### Server Events

- **connect** - A new socket has connected
- **disconnect** - A socket has disconnected

### Socket Events

- **subscribe** - A socket has requested a subscription to a channel
- **unsubscribe** - A socket no long wants messages from a channel
- **publish** - A socket has a message to publish for a channel

### Socket.subscribe(channel, offset, onMessages)

| Argument     |    type    | Required | Default | Description              |
| :----------- | :--------: | :------: | :-----: | ------------------------ |
| `channel`    | **string** |   yes    |    -    | Channel identifier key   |
| `offset`     | **string** |    no    |   `$`   | Redis stream offset      |
| `onMessages` | **number** |   yes    |  8080   | Message handler function |

If no `offset` is provided, the `onMessages` handler function is expected in the 2nd argument place, ie:

```js
// Subscribe with offset
socket.subscribe(channel, offset, onMessages)
// Subscribe with default "$" offset
socket.subscribe(channel, onMessages)
```

### Socket.unsubscribe(channel)

Unsubscribes a socket from a given channel. This is called automatically when a socket disconnects, if there is no existing `disconnect` handler defined.

| Argument  |    type    | Required | Default | Description                 |
| :-------- | :--------: | :------: | :-----: | --------------------------- |
| `channel` | **string** |   yes    |    -    | Channel to unsubscribe from |

### Socket.emit()

Send data to a connected socket

### Redistribute.publish()

Send data upstream to the Redis service

## Client

### RedistributeClient()

### RedistributeClient.load()

### RedistributeClient.subscribe()

### RedistributeClient.unsubscribe()

### RedistributeClient.publish()

### Events

- `connect`
- `disconnect`
