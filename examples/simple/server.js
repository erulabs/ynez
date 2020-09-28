import ynez from 'ynez'

const River = ynez.server()

River.model('user', {
    username: {
        type: 'string',
        // Connected users are only allowed to query about themselves:
        filter: _input => stream.username
    },
    secret: {
        type: 'string',
        // This field will never be shared with clients
        private: true,
        // In order to update this model, you must have the same username as the field value!
        authorize: (stream, model) => stream.username === model.username
    },
    age: {
        type: 'string',
        // Validate input!
        validate: (input) => {
            return input < 200
        }
    }
})

River.on('connection', stream => {
    // Fake auth :)
    stream.username = 'test'
})

River.listen(4000)