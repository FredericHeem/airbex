process.env.DEBUG = ''

require('shelljs/global')
var fs = require('fs')
, path = require('path')
, _ = require('underscore')

task('publish-prod', function() {
    jake.exec([
        'git checkout prod',
        'git merge master',
        'git checkout master'
    ])


    var config = require('./config')
    , aws2js = require('aws2js')
    , s3 = aws2js.load('s3', config('aws').accessKeyId, config('aws').secretAccessKey)
    , _ = require('underscore')
    , sassets = require('sassets')
    , async = require('async')

    s3.setBucket('www.snowco.in')

    var b = require('browserify')()

    var escapeLines = function(s) {
        return s.replace(/[\r\n]/g, '').replace(/"/g, '\\"')
    }

    b.register('.ejs', function(body) {
        return 'module.exports = "' + escapeLines(body) + '";\n'
    })

    fs.readdirSync(path.join(__dirname, 'assets/templates')).forEach(function(fn) {
        b.require('./assets/templates/' + fn)
    })

    b.addEntry('lib/client/entry.js')
    var script = b.bundle()

    var styles = [
        { path: 'assets/styles.less' }
    ]

    var scripts = [
        { type: 'js', content: script }
    ]

    var statics = [{
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
        jake.exec('git checkout master')
    })
})
