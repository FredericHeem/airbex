var expect = require('expect.js')
, db = require('../lib/db')
, fs = require('fs')
, expect = require('expect.js')
, path = require('path')
, accounts = require('../lib/accounts');

describe('accounts', function() {
    before(function(next) {
        db().query(fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8'), next);
    });
})