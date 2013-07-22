/* global describe, it */
var request = require('supertest')
, app = require('../..')

describe('language', function() {
    it('parses complex strings', function(done) {
        var res = {
            language: 'en-ca'
        }
        , lang = 'en-ca,en;q=0.8,en-us;q=0.6,de-de;q=0.4,de;q=0.2'

        request(app)
        .get('/v1/language')
        .set('Accept-Language', lang)
        .expect(200)
        .expect(res)
        .end(done)
    })

    it('parses understands priority', function(done) {
        var res = {
            language: 'de'
        }
        , lang = 'en;q=0.8,en-us;q=0.6,de-de;q=0.4,de;q=0.9'

        request(app)
        .get('/v1/language')
        .set('Accept-Language', lang)
        .expect(200)
        .expect(res)
        .end(done)
    })

    it('returns null when header is missing', function(done) {
        var res = {
            language: null
        }

        request(app)
        .get('/v1/language')
        .expect(200)
        .expect(res)
        .end(done)
    })

    it('returns null when header malformed', function(done) {
        var res = {
            language: null
        }

        request(app)
        .get('/v1/language')
        .set('Accept-Language', '?435830498wv5nf64g049v')
        .expect(200)
        .expect(res)
        .end(done)
    })
})
