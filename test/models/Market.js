var expect = require('expect.js')
, Book = require('../../models/Book');

describe('Book', function() {
    describe('asks', function() {
        it('has id-attribute _id', function() {
            var target = new Book({ market_id: 123 });
            expect(target.id).to.be(123);
        })
    })
})

