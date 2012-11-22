var sassets = require('sassets')
, path = require('path')
, _ = require('underscore')
, express = require('express')
, async = require('async')
, fs = require('fs');

sassets.ejs = function(asset, cb) {
    sassets.file(asset, function(err, res) {
        if (err) return cb(err);

        var ejs = require('ejs');

        try {
            res = ejs.render(res, asset.locals, asset.options);
            cb(null, res);
        } catch (err) {
            cb(err);
        }
    });
};

module.exports = {
    configure: function(app) {
        app.use(express.compress());

        app.get('/scripts.js', function(req, res, next) {
            sassets.combine([
                /*{ path: 'vendor/jquery 1.8.2/jquery-1.8.2.js' },
                { path: 'vendor/jquery cookie 1.3/jquery.cookie.js' },
                { path: 'vendor/bootstrap 2.2.1/js/bootstrap.js' },*/
                { type: 'browserify', path: 'lib/client/entry.js', uglify: false }
            ], function(err, scripts) {
                if (err) return next(err);
                res.contentType('text/javascript');
                res.end(scripts);
            });
        });

        app.get('/styles.css', function(req, res, next) {
            sassets.combine([
                { path: 'assets/styles.less' },
                { path: 'vendor/bootstrap 2.2.1/css/bootstrap.css' },
                { path: 'vendor/bootstrap 2.2.1/css/bootstrap-responsive.css' }
            ], function(err, styles) {
                if (err) return next(err);
                res.contentType('text/css');
                res.end(styles);
            });
        });

        app.get(/\/($|\?)/, function(req, res, next) {
            res.contentType('text/html');

            var locals = {
                templates: [],
                views: []
            };

            _.each(fs.readdirSync(path.join(__dirname, '../../assets/templates')), function(fn) {
                fn = path.join(__dirname, '../../assets/templates', fn);
                locals.templates[fn.match(/([^/\\]+)\.ejs$/)[1]] = fs.readFileSync(fn, 'utf8');
            });

            sassets.load({ path: 'assets/index.ejs', locals: locals }, function(err, r) {
                if (err) return next(err);
                res.end(r);
            });
        });

        app.use('/media', express.static(path.join(__dirname, '../../assets/media'), { maxAge: 1000 * 60 * 60 * 24 }));
    }
};