var Backbone = require('backbone')
, expect = require('expect.js')
, BookView = require('../../views/BookView')

describe('BookView', function() {
    describe('constructor', function() {
        it('exists', function() {
            var model = new Backbone.Model({
                depth: new Backbone.Collection()
            })

            var view = new BookView({ model: model })
        })
    })
})
