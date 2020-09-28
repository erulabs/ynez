import ynez from 'ynez-client'

ynez.connect('wss://localhost:4000').then(async river => {
    // Query resources:
    const user = await river.findOne('user', { username: 'test' })

    // Validate data:
    const { errors } = await river.validate('user', { username: 'this-username-is-too-long' })

    // Looks like we can create our user:
    if (!user && !errors) {
        user = await river.create('user', { username: 'test' })

        // Now we can easily follow all the events related to that user:
        const stream = await user.follow('user', { username: 'test' })
        stream.on('event', (data) => {
            console.log('Something happened to our user!')
        })

        // Let's fire an event!
        await stream.update('user', { username: 'test' }, { secret: 'foobar!' })

        // Secret is private, so we shouldn't have been allowed to add that field!
        // We should have permission to change our birthday:
        await stream.update('user', { username: 'test' }, { age: 'now!' })
    }  
})