var expect = require('expect.js')
, db = require('../../lib/db');

function testFunction(name, cb) {
    var client = db();
    client.query('BEGIN;SELECT ' + name + '();ROLLBACK;', function(err, res) {
        client.end();
        if (err) console.error(err);
        cb(err);
    });
}

describe('orders', function() {
    describe('create', function() {
    });
});