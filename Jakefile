process.env.DEBUG = ''
process.env.NODE_ENV = 'testing'

require('shelljs/global')
var fs = require('fs')
, path = require('path')
, _ = require('underscore')

task('publish-prod', function() {
    jake.exec('git checkout prod')
    process.env.NODE_ENV = 'prod'

    var config = require('./config')
    , aws2js = require('aws2js')
    , s3 = aws2js.load('s3', config.aws.accessKeyId, config.aws.secretAccessKey)
    , _ = require('underscore')
    , sassets = require('sassets')
    , async = require('async')

    s3.setBucket('www.bunny.io')

    var scripts = [
        { path: path.join(__dirname, 'vendor/underscore-min.js') },
        { path: path.join(__dirname, 'vendor/firebase.js') },
        { path: path.join(__dirname, 'vendor/firebase-auth-client.js') },
        { path: path.join(__dirname, 'vendor/jquery-1.9.1.min.js') },
        { type: 'browserify', path: path.join(__dirname, 'lib/client/entry.js') }
    ]

    var styles = [
        { path: 'assets/styles.less' }
    ]

    var statics = [{
        source: 'assets/media/cards.svg',
        dest: 'media/cards.svg',
    }, {
        source: 'assets/index.html',
        dest: 'index.html'
    }]

    function compileScripts(cb) {
        async.map(scripts, sassets.load, function(err, srcs) {
            if (err) return cb(err)
            var script = _.reduce(srcs, function(a, b) { return a + b })
            cb(null, script)
        })
    }

    function compileStyles(cb) {
        async.map(styles, sassets.load, function(err, styles) {
            if (err) return cb(err)
            var style = _.reduce(styles, function(a, b) { return a + b })
            cb(null, style)
        })
    }

    async.parallel({
        scripts: function(cb) {
            console.log('compiling scripts')

            compileScripts(function(err, res) {
                if (err) return cb(err)
                console.log('scripts compiled. uploading')

                s3.putBuffer('scripts.js',
                    new Buffer(res, 'utf8'),
                    'public-read',
                    { 'content-type': 'application/javascript' },
                    cb
                )
            })
        },

        styles: function(cb) {
            console.log('compiling styles')

            compileStyles(function(err, res) {
                if (err) return cb(err)
                console.log('styles compiled. uploading')

                s3.putBuffer('styles.css',
                    new Buffer(res, 'utf8'),
                    'public-read',
                    { 'content-type': 'text/css' },
                    cb
                )
            })
        },

        statics: function(cb) {
            async.forEach(statics, function(s, cb) {
                s3.putFile(s.dest, s.source, 'public-read', {}, cb)
            }, cb)
        }
    }, function(err) {
        if (err) throw err
    })
})
