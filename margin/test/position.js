/* global describe, it */
var expect = require('expect.js')
, Position = require('../position')

var mockClient = {
    cancel: function(id, cb) {
        console.log('[Mock Client] Cancel %d', id)
        cb
    },

    order: function(order, cb) {
        console.log('[Mock Client] Place order %j', order)
        cb()
    }
}

describe('Position', function() {
    describe('merge', function() {
        it('produces cancellations', function() {
            var p = new Position('BTCUSD', mockClient)
            var desired = []
            var actual = [
                {
                    side: 'bid',
                    price: '1.0',
                    volume: '100'
                }
            ]
            var changes = p.merge(desired, actual)
            expect(changes.length).to.be(1)
            var change = changes[0]
            expect(change.price).to.be('1.0')
            expect(change.volume).to.be('0')
        })

        it('produces alterations', function() {
            var p = new Position('BTCUSD', mockClient)
            var desired = [
                {
                    side: 'bid',
                    price: '1.0',
                    volume: '99'
                }
            ]
            var actual = [
                {
                    side: 'bid',
                    price: '1.0',
                    volume: '100'
                }
            ]
            var changes = p.merge(desired, actual)
            expect(changes.length).to.be(1)
            var change = changes[0]
            expect(change.price).to.be('1.0')
            expect(change.volume).to.be('99')
        })

        it('produces creations', function() {
            var p = new Position('BTCUSD', mockClient)
            var desired = [
                {
                    side: 'bid',
                    price: '1.0',
                    volume: '99'
                }
            ]
            var actual = []
            var changes = p.merge(desired, actual)
            expect(changes.length).to.be(1)
            var change = changes[0]
            expect(change.price).to.be('1.0')
            expect(change.volume).to.be('99')
        })
    })
})
