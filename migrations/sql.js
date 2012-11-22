var fs = require('fs')
, path  = require('path')
, db = require('../lib/db');

module.exports = function(fn, cb) {
    var q = fs.readFileSync(fn, 'utf8');
    db.query(q, function(err) {
        if (err) throw err;
        cb();
    });
};