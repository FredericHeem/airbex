var expect = require('expect.js')
, Book = require('../../../lib/client/models/Book');

describe('Book', function() {
    describe('asks', function() {
        it('has id-attribute _id', function() {
            var target = new Book({ book_id: 123 });
            expect(target.id).to.be(123);
        })
    })
})

