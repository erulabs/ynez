// @flow

/* flow-include
declare var describe: Function;
declare var it: Function;
*/

const chai = require('chai')
const expect = chai.expect

const Redistribute = require('../lib/Redistribute.js')

let instance
describe('Redistribute', () => {
  describe(`new Redistribute()`, () => {
    it('Creates without connecting', () => {
      instance = new Redistribute(process.env.REDIS_URIS || '', {
        autoConnect: false
      })
      expect(instance.subscriptions).to.exist
    })
  })
  describe(`.connect()`, () => {
    it('Connects to redis', async () => {
      await instance.connect()
      expect(instance.pool).to.exist
    })
  })
  const testSubFunction = messages => {}
  describe(`.subscribe()`, () => {
    it('Allows a subsciptions to redis streams', async () => {
      instance.subscribe('testId', '$', testSubFunction)
      expect(Object.keys(instance.subscriptions)).to.have.lengthOf(1)
      expect(instance.subscriptions['testId']).to.equal(1)
    })
  })
  describe(`.unsubscribe()`, () => {
    it('Removes subsciptions from redis streams', () => {
      instance.unsubscribe('testId', testSubFunction)
      expect(Object.keys(instance.subscriptions)).to.have.lengthOf(0)
      expect(instance.subscriptions['testId']).to.not.exist
    })
  })
  describe(`.add()`, () => {
    function isMessagesWellFormed (messages) {
      expect(Array.isArray(messages), 'Array.isArray(messages)').to.equal(true)
      expect(Array.isArray(messages[0]), 'Array.isArray(messages[0])').to.equal(
        true
      )
      expect(
        Array.isArray(messages[0][1]),
        'Array.isArray(messages[0][1])'
      ).to.equal(true)
    }

    it('Adds events and gets them via subscriptions', async () => {
      let messages
      const testObj = { foo: 'bar' }
      function testSubFunction2 (msgs) {
        messages = msgs
      }
      const addedTimestamp = await instance
        .subscribe('testId2', '$', testSubFunction2)
        .add('testId2', 'ADD_TEST', testObj)

      isMessagesWellFormed(messages)
      expect(messages[0][0]).to.equal(addedTimestamp)

      expect(messages[0][1][0], 'messages[0][1][0]').to.equal('ADD_TEST')
      expect(messages[0][1][1], 'messages[0][1][1]').to.deep.equal(testObj)

      instance.unsubscribe('testId2', testSubFunction)
    })

    it('Can subscribe to many streams', async () => {
      let messages3
      let messages4
      const testFunc3 = msgs => {
        messages3 = msgs
      }
      const testFunc4 = msgs => {
        messages4 = msgs
      }
      await instance
        .subscribe('testId3', '$', testFunc3)
        .subscribe('testId4', '$', testFunc4)
        .add('testId3', 'testId3DATA', { blgeh: 'bar' })

      isMessagesWellFormed(messages3)
      expect(messages4).to.equal(undefined)

      await instance.add('testId4', 'testId4DATA', { blgeh: 'bar' })
      isMessagesWellFormed(messages4)

      instance.unsubscribe('testId3', testSubFunction)
      instance.unsubscribe('testId4', testSubFunction)
    })
  })
  describe(`.disconnect()`, () => {
    it('disconnects from redis', async () => {
      await instance.disconnect()
      expect(instance.pool).to.not.exist
    }).timeout(5500)
  })
})
