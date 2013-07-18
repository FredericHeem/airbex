/* global describe, it */
var expect = require('expect.js')
, request = require('supertest')
, app = require('../..')
, mock = require('../mock')

describe('currencies', function() {
    describe('index', function() {
        it('returns currencies', function(done) {
            var read = mock(app.conn.read, 'query', function(query, cb) {
                expect(query).to.match(/FROM currency/)
                cb(null, {
                    rows: [
                        {
                            currency_id: 'BTC',
                            scale: 8
                        },
                        {
                            currency_id: 'NOK',
                            scale: 5
                        }
                    ]
                })
            })

            request(app)
            .get('/v1/currencies')
            .expect(200)
            .expect('Content-Type', /json/)
            .expect([
                {
                    id: 'BTC',
                    scale: 8
                },
                {
                    id: 'NOK',
                    scale: 5
                }
            ])
            .end(function(err) {
                read.restore()
                done(err)
            })
        })
    })
})
