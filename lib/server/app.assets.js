var sassets = require('sassets')
, path = require('path')
, _ = require('underscore')
, express = require('express')
, ejs = require('ejs')
, async = require('async')
, fs = require('fs');

sassets.ejs = function(asset, cb) {
    sassets.file(asset, function(err, res) {
        if (err) return cb(err);

        var ejs = require('ejs');

        try {
            res = ejs.render(res, asset.locals, asset.options);
            cb(null, res)
        } catch (e) {
            cb(e);
        }
    });
};

module.exports = {
    configure: function(app) {
        var b = require('browserify')()

        var escapeLines = function(s) {
            return s.replace(/[\r\n]/g, '').replace(/"/g, '\\"')
        }

        b.register('.ejs', function(body) {
            return 'module.exports = "' + escapeLines(body) + '";\n'
        })

        fs.readdirSync('assets/templates').forEach(function(fn) {
            console.log('require-ing ' + fn)
            b.require('./assets/templates/' + fn)
        })

        b.append(fs.readFileSync(path.join(__dirname, '../../vendor/alertify 0.1.1/alertify.min.js')))

        b.addEntry('lib/client/entry.js')
        var script = b.bundle()

        app.get('/scripts.js', function(req, res, next) {
            res.contentType('text/javascript')
            res.end(script)
        })

        var styles

        sassets.combine([
            { path: 'assets/styles.less' },
            { path: 'vendor/bootstrap 2.2.1/css/bootstrap.css' },
            { path: 'vendor/bootstrap 2.2.1/css/bootstrap-responsive.css' },
            { path: 'vendor/alertify 0.1.1/alertify.css' }
        ], function(err, s) {
            if (err) throw err
                styles = s
        })

        app.get('/styles.css', function(req, res, next) {
            res.contentType('text/css');
            res.end(styles);
        })

        app.get('/bitcoin.otc.txt', function(rq, res, next) {
            fs.readFile(path.join(__dirname, '../../assets/bitcoin.otc.txt'), 'utf8', function(err, body) {
                if (err) return next(err)
                res.contentType('text/text')
                res.send(body)
            })
        })

        var index = fs.readFileSync('assets/index.html', 'utf8')

        app.get(/\/($|\?)/, function(req, res, next) {
            res.contentType('text/html');
            res.end(index)
        })

        app.use('/media', express.static(path.join(__dirname, '../../assets/media'), { maxAge: 1000 * 60 * 60 * 24 }));
    }
}