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
})
