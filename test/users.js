var expect = require('expect.js')
, db = require('../lib/db')
, fs = require('fs')
, expect = require('expect.js')
, path = require('path')
, users = require('../lib/users');

describe('users', function() {
    before(function(next) {
        var client = db();
        client.query(fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8'), next);
    });

    describe('create', function() {
        it('inserts into db', function(done) {
            users.create({ username: 'DerpDerp', password: 'passord' }, function(err, id) {
                if (err) return done(err);
                expect(id).to.be.a('number');

                var client = db();
                client.query({
                    text: 'select username_lower from "user" where user_id = $1',
                    values: [id]
                }, function(err, res) {
                    if (err) return done(err);
                    expect(res.rows[0].username_lower).to.be('derpderp');
                    done();
                });
            });
        });
    });
});