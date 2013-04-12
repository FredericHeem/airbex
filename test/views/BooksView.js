var Backbone = require('backbone')
, expect = require('expect.js')
, BooksView = require('../../views/BooksView')

describe('BooksView', function() {
    describe('constructor', function() {
        it('exists', function() {
            var collection = new Backbone.Collection()
            var view = new BooksView({ collection: collection })
        })
    })
})
