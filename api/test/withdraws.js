/* global describe, it */
var withdraws = require('../withdraws')
, dummy = require('./dummy')
, expect = require('expect.js')

describe('withdraws', function() {
    describe('query', function() {
        it('filters on user_id', function(done) {
            var uid = dummy.id()
            , app = {
                conn: {
                    read: {
                        query: function(q) {
                            expect(q.text).to.match(/user_id = \$1/)
                            expect(q.values).to.eql([uid])
                            done()
                        }
                    }
                }
            }

            withdraws.query(app, { user_id: uid }, null)
        })
    })

    describe('formatDestination', function() {
        it('can format iban+swift', function() {
            var result = withdraws.formatDestination({
                method: 'bank',
                bank_iban: 'ABCDEF',
                bank_swiftbic: 'SSSBBB'
            })

            expect(result).to.be('IBAN: ABCDEF, SWIFT: SSSBBB')
        })

        it('can format domestic', function() {
            var result = withdraws.formatDestination({
                method: 'bank',
                bank_account_number: 'ABCDEF'
            })

            expect(result).to.be('Domestic: ABCDEF')
        })

        it('can format usa style', function() {
            var result = withdraws.formatDestination({
                method: 'bank',
                bank_account_number: '123',
                bank_routing_number: 'R123',
                bank_swiftbic: 'S321'
            })

            expect(result).to.be('Account: 123, SWIFT: S321, Rtn: R123')
        })

        it('can format international style', function() {
            var result = withdraws.formatDestination({
                method: 'bank',
                bank_account_number: '123',
                bank_swiftbic: 'S321'
            })

            expect(result).to.be('Account: 123, SWIFT: S321')
        })
    })
})
