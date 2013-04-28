var expect = require('expect.js')
, Market = require('../../models/Market');

describe('Market', function() {
    describe('asks', function() {
        it('has id-attribute _id', function() {
            var target = new Market({ market_id: 123 });
            expect(target.id).to.be(123);
        })
    })
})

