var sassets = require('sassets')
, path = require('path')
, express = require('express')
, fs = require('fs')
, _ = require('underscore')
, async = require('async');

module.exports = function(app) {
    var b = require('browserify')()

    var escapeLines = function(s) {
        return s.replace(/[\r\n]/g, '').replace(/"/g, '\\"')
    }

    b.register('.ejs', function(body) {
        return 'module.exports = "' + escapeLines(body) + '";\n'
    })

    fs.readdirSync('assets/templates').forEach(function(fn) {
        b.require('./assets/templates/' + fn)
    })

    b.addEntry('test/client/index.js')
    var script = b.bundle()

    app.get('/tests.js', function(req, res, next) {
        var tests = [
            { path: 'vendor/jquery 1.8.2/jquery-1.8.2.js' },
            { path: 'node_modules/mocha/mocha.js' },
            // causes "describe" to become defined by mocha
            { type: 'raw', content: 'mocha.setup("bdd");' },
            { type: 'js', content: script }
        ];
        async.map(tests, sassets.load, function(err, srcs) {
            if (err) return next(err);
            res.end(_.reduce(srcs, function(a, b) { return a + b }));
        });
    });

    app.get('/styles.css', function(req, res, next) {
        var styles = [
            { path: 'node_modules/mocha/mocha.css' }
        ];
        async.map(styles, sassets.load, function(err, styles) {
            if (err) return next(err);
            res.end(_.reduce(styles, function(a, b) { return a + b }));
        });
    });

    app.get('/', function(req, res, next) {
        fs.readFile(path.join(__dirname, 'tests.html'), 'utf8', function(err, html) {
            err ? next(err) : res.end(html);
        });
    });

    return app;
};
