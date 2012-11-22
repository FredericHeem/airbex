var expect = require('expect.js')
, Book = require('../../lib/models/Book');

describe('Book', function() {
    describe('asks', function() {
        it('has id-attribute _id', function() {
            var target = new Book({ book_id: 123 });
            expect(target.id).to.be(123);
        });

        it('parses embedded bids', function() {
            var target = new Book({
                book_id: 1,
                bids: [{
                    price: 11e8,
                    volume: 100e3,
                    scale: 3
                }]
            }, { parse: true });

            var bids = target.get('bids');
            expect(bids).to.not.be.an('array');
            expect(bids.at).to.be.a('function');

            expect(bids.at(0)).to.be.ok();
            expect(bids.at(0).id).to.be(11e8);
            expect(bids.at(0).get('volume')).to.be(100e3);
        });
    });
});