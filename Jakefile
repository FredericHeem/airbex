process.env.DEBUG = ''

require('shelljs/global')
var fs = require('fs')
, path = require('path')
, _ = require('underscore')

task('test', ['test-node', 'test-browser'])

task('test-node', function() {
    jake.exec('mocha -R spec', { printStderr: true, printStdout: true })
})

task('test-browser', function() {
    var app = require('express')()
    , server = require('http').createServer(app)
    require('./test/support/phantom-app.js')(app)
    server.listen(9572, '127.0.0.1')

    jake.exec('mocha-phantomjs -R spec http://localhost:9572', function() {
        server.close()
    }, {
        printStdout: true,
        printStderr: true
    })
})

task('publish-prod', function() {
    jake.exec([
        'git checkout prod',
        'git merge master',
        'git checkout master'
    ])


    var config = require('./config.dev.json')
    , aws2js = require('aws2js')
    , s3 = aws2js.load('s3', config.aws.accessKeyId, config.aws.secretAccessKey)
    , _ = require('underscore')
    , sassets = require('sassets')
    , async = require('async')

    s3.setBucket('snowco.in')

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
    b.append(fs.readFileSync(path.join(__dirname, 'vendor/sjcl.js')))
    var script = b.bundle()

    var styles = [
        { path: 'assets/styles.less' },
        { path: 'vendor/bootstrap 2.2.1/css/bootstrap.css' },
        { path: 'vendor/bootstrap 2.2.1/css/bootstrap-responsive.css' }
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

task('build-styles', function() {
    mkdir('build')

    var files = [
        'vendor/bootstrap-2.2.1/css/bootstrap.css',
        'assets/styles.less'
    ]

    files.reduce(function(res, fn) {
        return res + exec('lessc ' + fn, { silent: true }).output
    }, '')
    .to('build/styles.css')
})

task('build-scripts', function() {
    mkdir('-p', 'build')
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

    b.append(fs.readFileSync('vendor/jquery-1.8.2/jquery-1.8.2.js'))
    b.append(fs.readFileSync('vendor/bootstrap-2.2.1/js/bootstrap.min.js'))
    b.append(fs.readFileSync('vendor/alertify-0.1.1/alertify.min.js'))
    b.append(fs.readFileSync('vendor/sjcl.js'))

    b.addEntry('lib/client/entry.js')
    var script = b.bundle()
    script.to('build/scripts.js')
})

task('build', ['build-scripts', 'build-styles'], function() {
    cp('assets/index.html', 'build/')
    cp('assets/bitcoin.otc.txt', 'build/')
})

task('debug', ['build'], function() {
    var express = require('express')
    , app = express()
    , server = require('http').createServer(app)
    app.use(express.static('build'))
    server.listen(5073)
})
