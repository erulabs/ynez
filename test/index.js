// @flow

/* flow-include
declare var describe: Function;
declare var it: Function;
*/

const chai = require('chai')
const expect = chai.expect

const Redistribute = require('../src/server')

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
    it('Connects to redis', done => {
      instance.connect().then(() => {
        expect(instance.pool).to.exist
        done()
      })
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
    it('Adds events and gets them via subscriptions', done => {
      function testSubFunction2 (messages) {
        expect(Array.isArray(messages)).to.equal(true)
        expect(Array.isArray(messages[0])).to.equal(true)

        const testContent = messages[0][1]
        expect(Array.isArray(testContent)).to.equal(true)
        expect(testContent[0]).to.equal('ADD_TEST')
        done()
      }
      instance.subscribe('testId2', '$', testSubFunction2)
      instance.add('testId2', 'ADD_TEST', { foo: 'bar' }).then(added => {
        instance.unsubscribe('testId2', testSubFunction)
      })
    })
  })
  describe(`.disconnect()`, () => {
    it('disconnects from redis', async () => {
      await instance.disconnect()
      expect(instance.pool).to.not.exist
    }).timeout(5500)
  })
})
