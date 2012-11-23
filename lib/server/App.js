var express = require('express')
, _ = require('underscore')
, async = require('async')
, qs = require('qs')
, debug = require('debug')('snow:web')
, users = require('./users')
, config = require('../../config')
, oauth = require('oauth')
, request = require('request')
, db = require('monk')(config('db'))
, crypto = require('crypto')
, bcrypt = require('bcrypt')
, util = require('util')
, url = require('url')
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

    this.app.get('/authorize/redirect', function(req, res, next) {
        debug('redirecting user to google for authentication')

        var body = {
            response_type: 'code',
            client_id: config('google').clientId,
            redirect_uri: config('google').redirect,
            scope: 'https://www.googleapis.com/auth/userinfo.profile',
            state: ''
        }

        res.redirect(302, 'https://accounts.google.com/o/oauth2/auth?' + qs.stringify(body))
    })

    var oa = new oauth.OAuth2(
        config('google').clientId,
        config('google').clientSecret,
         '',
         'https://accounts.google.com/o/oauth2/auth',
         'https://accounts.google.com/o/oauth2/token'
    )

    this.app.get('/authorize/callback', function(req, res, next) {
        debug('handling callback from oauth')

        if (req.query.error) return next(new Error(req.query.error))

        var code = req.query.code
        if (!code) return next(new Error('code missing'))

        var accessToken, user, google, user_key, user_secret, user_id, apiUser

        async.series({
            'access token': function(next) {

                oa.getOAuthAccessToken(code, {
                    redirect_uri: config('google').redirect,
                    grant_type: 'authorization_code'
                }, function(err, access_token, refresh_token) {
                    if (err) return next(err)
                    accessToken = access_token
                    next()
                })
            },

            'get user info': function(next) {
                oa.get(
                    'https://www.googleapis.com/oauth2/v1/userinfo?alt=json',
                    accessToken,
                    function(err, profile) {
                        if (err) return next(err)
                        profile = JSON.parse(profile)
                        console.log(profile)
                        google = profile.id
                        console.log('google', google)
                        next()
                    }
                )
            },

            'find existing user': function(next) {
                debug('looking for existing user')

                db.get('users').findOne({ google: google }, function(err, u) {
                    if (err) return next(err)
                    user = u
                    debug('existing user ' + (u ? '' : 'not ') + ' found')
                    next()
                })
            },

            'create user with api': function(next) {
                if (user) return next()

                debug('creating user over api')

                request({
                    url: config('rest') + '/public/users',
                    method: 'POST',
                    json: true
                }, function(err, rres, data) {
                    if (err) return next(err)
                    if (rres.statusCode < 200 || rres.statusCode >= 300) return next(new Error(data))
                    console.log(data)
                    apiUser = data
                    next()
                })
            },

            'insert user in mongo': function(next) {
                if (user) return next()

                debug('creating user in mongo')

                user = {
                    _id: apiUser.user_id,
                    apiKey: apiUser.key,
                    apiSecret: apiUser.secret,
                    google: google
                }

                debug('inserting user ' + util.inspect(user))

                db.get('users').insert(user, function(err) {
                    next(err)
                })
            }
        }, function(err) {
            if (err) {
                console.error(err)
                return next(err)
            }

            debug('saving session and redirecting')
            req.session.user = user
            res.redirect(302, '/')
        })
    })

    this.app.get('/api/auth/whoami', function(req, res, next) {
        if (!req.session || !req.session.user) return res.send({ });
        res.send({ user: _.pick(req.session.user, '_id') })
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