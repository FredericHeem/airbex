var express = require('express')
, _ = require('underscore')
, qs = require('querystring')
, debug = require('debug')('snow:web')
, users = require('./users')
, config = require('../../config')
, request = require('request')
, db = require('monk')(config('db'))
, crypto = require('crypto')
, config = require('../../config');

function sign(form, nonce, secret) {
    var body = qs.stringify(form);
    var sec_key_buffer = Buffer(secret, 'base64');
    var hmac = crypto.createHmac('sha512', sec_key_buffer);
    hmac.update(body);
    hmac.update(nonce);
    return hmac.digest('base64');
}

var App = module.exports = function(port) {
    this.app = express();

    this.app.use(express.cookieParser());
    this.app.use(express.bodyParser());
    this.app.use(express.session({
        secret: config('session'),
        // allow client to know if he has a session
        cookie: { httpOnly: false }
    }));

    this.server = require('http').createServer(this.app);

    debug('http server listening on ' + port);

    this.server.listen(port);

    this.app.post('/api/register', function(req, res, next) {
        request({
            url: config('rest') + '/public/createUser',
            method: 'POST'
        }, function(err, rres, data) {
            if (err) return next(err);

            db.get('users').insert({
                apiKey: data.key,
                apiSecret: data.secret,
                username: req.params.username,
                password: bcrypt.hashSync(bcrypt.genSaltSync(10))
            }, function(err) {
                if (err) return next(err);
                req.session.user = { apiKey: data.key, apiSecret: data.secret };
                res.send({ });
            });
        });
    });

    this.app.post('/api/session/create', function(req, res, next) {
        users.login(req.body.username, req.body.password, function(err, user) {
            if (err) return next(err);
            if (!user) return res.send({ error: 'wrong username/password' });
            req.session.user = user;
            res.send({ user: _.pick(user, 'username') });
        });
    });

    this.app.get('/api/auth/whoami', function(req, res, next) {
        if (!req.session || !req.session.user) return res.send({ });
        res.send({ user: _.pick(req.session.user, 'username') });
    });

    this.app.use(function(req, res, next) {
        debug(req.url)
        if (!req.url.match(/^\/api\/public\//)) return next();

        debug('proxying public call')

        request({
            url: config('rest') + req.url.replace(/^\/api/, ''),
            method: req.method,
            form: req.body
        }, function(err, rres, data) {
            var statusCode = err ? 500 : rres.statusCode;
            var body = err ? err.message : data;

            res.writeHead(statusCode, { 'Content-Type': 'application/json' });

            if (body) res.write(body);
            res.end();
        });
    });

    this.app.use(function(req, res, next) {
        if (!req.url.match(/^\/api\/private\//)) return next();

        if (!req.session || !req.session.user) {
            return res.send(401, 'not logged in');
        }

        debug('proxying request to ' + req.url);

        req.url = req.url.replace(/^\/api/, '');

        var nonce = '1'; // todo
        var url = config('rest') + req.url.replace(/^\/api/, '');

        request({
            url: url,
            method: req.method,
            headers: {
                'snow-version': 1,
                'snow-nonce': nonce,
                'snow-key': req.session.user.apiKey,
                'snow-sign': sign(req.body || {}, nonce, req.session.user.apiSecret)
            },
            form: req.body
        }, function(err, rres, data) {
            debug('received response for url')

            var statusCode = err ? 500 : rres.statusCode;
            var body = err ? err.message : data;

            console.log(err)

            if (rres) debug(rres.statusCode + ' for ' + req.method + ' ' + url);

            if (body) {
                res.writeHead(statusCode, { 'Content-Type': 'application/json' });
                res.write(body);
            } else {
                res.writeHead(rres.statusCode);
            }

            res.end();
        });
    });

    require('./app.assets').configure(this.app);
};

_.extend(App.prototype, {
});