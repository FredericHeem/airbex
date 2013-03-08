var Backbone = require('backbone')
, expect = require('expect.js')
, BooksView = require('../../../lib/client/views/BooksView')

describe('BooksView', function() {
    describe('constructor', function() {
        it('exists', function() {
            var collection = new Backbone.Collection()
            var view = new BooksView({ collection: collection })
        })
    })
})
