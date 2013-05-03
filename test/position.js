var expect = require('expect.js')
, num = require('num')
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

    describe('groupOrders', function() {
        it('does not mix sides or prices', function() {
            var p = new Position('BTCUSD', mockClient)
            var orders = [
                {
                    side: 'bid',
                    price: '1',
                    volume: '11'
                },
                {
                    side: 'bid',
                    price: '1',
                    volume: '10'
                },
                {
                    side: 'ask',
                    price: '1',
                    volume: '11'
                },
                {
                    side: 'bid',
                    price: '1.5',
                    volume: '10'
                }
            ]

            var groups = p.groupOrders(orders)

            var group = groups.filter(function(group) {
                return group.side == 'bid' && group.price == '1'
            })[0]

            expect(group).to.be.ok()
            expect(group.volume).to.be('21')
            expect(group.orders.length).to.be(2)
        })

        it('handles decimals', function() {
            var p = new Position('BTCUSD', mockClient)
            var orders = [
                {
                    side: 'bid',
                    price: '1',
                    volume: '0.1'
                },
                {
                    side: 'bid',
                    price: '1',
                    volume: '0.2'
                }
            ]

            var groups = p.groupOrders(orders)

            var group = groups.filter(function(group) {
                return group.side == 'bid' && group.price == '1'
            })[0]

            expect(group).to.be.ok()
            expect(group.volume).to.be('0.3')
        })
    })

    describe('setPosition', function() {
        it('does nothing if unchanged', function() {
            var p = new Position('BTCUSD', {})
            p.cancelOrders = null
            p.setPosition({
                side: 'bid',
                price: '0.1',
                volume: '10',
                actual: {
                    volume: '10',
                    orders: []
                }
            })
        })

        it('cancels', function(done) {
            var p = new Position('BTCUSD', {})
            p.cancelOrders = function(orders) {
                expect(orders.length).to.be(2)
                done()
            }
            p.setPosition({
                side: 'bid',
                price: '0.1',
                volume: '0',
                actual: {
                    volume: '10',
                    orders: [
                        {
                            id: '1',
                            volume: '5'
                        },
                        {
                            id: '2',
                            volume: '5'
                        }
                    ]
                }
            })
        })

        it('creates', function(done) {
            var p = new Position('XRPLTC', {
                order: function(order, cb) {
                    expect(order).to.be.ok()
                    expect(order.price).to.be('0.1')
                    expect(order.volume).to.be('0.3')
                    expect(order.side).to.be('bid')
                    expect(order.market).to.be('XRPLTC')
                    done()
                }
            })
            p.setPosition({
                side: 'bid',
                price: '0.1',
                volume: '0.3',
                actual: {
                    volume: '0',
                    orders: []
                }
            })
        })
    })
})
