var orders = require('../lib/orders')
, expect = require('expect.js');

describe('orders', function() {
    describe('create', function() {
        it('fails when volume has decimals', function(next) {
            orders.create(1, 1, 1, 1, 1.5, function(err) {
                expect(err.message).to.be('volume has decimals');
                next();
            });
        });

        it('fails when volume is negative', function(next) {
            orders.create(1, 1, 1, 1, -1, function(err) {
                expect(err.message).to.be('volume <= 0');
                next();
            });
        });

        it('fails when price is negative', function(next) {
            orders.create(1, 1, 0, -1, 1, function(err) {
                expect(err.message).to.be('price <= 0');
                next();
            });
        });

        it('fails when volume is zero', function(next) {
            orders.create(1, 1, 1, 1, 0, function(err) {
                expect(err.message).to.be('volume <= 0');
                next();
            });
        });

        it('fails when price is zero', function(next) {
            orders.create(1, 1, 1, 0, 1, function(err) {
                expect(err.message).to.be('price <= 0');
                next();
            });
        });

        it('fails when price has decimals', function(next) {
            orders.create(1, 1, 0, 1.5, 1, function(err) {
                expect(err.message).to.be('price has decimals');
                next();
            });
        });
    });
});