require('shelljs/global')
var sever

task('test-browser', ['test-browser-host'], function() {
    jake.exec('mocha-phantomjs -R spec http://localhost:5073/index.html', function(res) {
        server.close()
        complete()
    }, {
        printStdout: true
    })
}, { async: true })

task('test-browser-host', ['build/test/index.html'], function() {
    server = createServer('build/test')
})

function addTemplatesToBundle(b) {
    var escapeLines = function(s) {
        return s.replace(/[\r\n]/g, '').replace(/"/g, '\\"')
    }

    b.register('.ejs', function(body) {
        return 'module.exports = "' + escapeLines(body) + '";\n'
    })

    ls('assets/templates').forEach(function(fn) {
        b.require('./assets/templates/' + fn)
    })
}

file('build/test/styles.css', function() {
    cp('-f', 'node_modules/mocha/mocha.css', 'build/test/styles.css')
})

file('build/test/index.html', [
    'test/support/tests.html',
    'build/test/scripts.js',
    'build/test/styles.css'
], function() {
    cp('-f', 'test/support/tests.html', 'build/test/index.html')
})

file('build/test/scripts.js', function() {
    var b = require('browserify')()
    addTemplatesToBundle(b)

    b.prepend(cat('node_modules/mocha/mocha.js'))
    b.addEntry('test/client/index.js')

    mkdir('-p', 'build/test')
    b.bundle().to('build/test/scripts.js')
})

function createServer(dir, port) {
    var express = require('express')
    , app = express()
    , server = require('http').createServer(app)
    app.use(express.static(dir))
    server.listen(port || 5073)
    return server
}

task('test', ['test-node', 'test-browser'])

task('test-node', function() {
    jake.exec('mocha -R spec', { printStderr: true, printStdout: true })
})

file('build/styles.css', [
    'assets/styles.less'
], function() {
    var files = [
        'assets/styles.less'
    ]

    mkdir('-p', 'build')

    files.reduce(function(res, fn) {
        return res + exec('lessc ' + fn, { silent: true }).output
    }, '')
    .to('build/styles.css')
})

file('build/scripts.js', [
    'vendor/sjcl.js',
    'lib/client/entry.js'
], function() {
    var b = require('browserify')()
    addTemplatesToBundle(b)
    b.append(cat('vendor/sjcl.js'))

    b.addEntry('lib/client/entry.js')

    b.bundle().to('build/scripts.js')
})

task('publish-prod', [
    'test',
    'build'
], function() {
    var config = require('./config.dev.json')
    , aws2js = require('aws2js')
    , s3 = aws2js.load('s3', config.aws.accessKeyId, config.aws.secretAccessKey)
    , _ = require('underscore')
    , async = require('async')

    s3.setBucket('snowco.in')

    var files = {
        'scripts.js': { 'content-type': 'application/javascript' },
        'styles.css': { 'content-type': 'text/css' },
        'bitcoin.otc.txt': { 'content-type': 'text/plain' },
        'index.html': { 'content-type': 'application/html' }
    }

    async.forEach(_.keys(files), function(f, next) {
        console.log('uploadig %s', f)
        s3.putFile(f, 'build/' + f, 'public-read', files[f], next)
    }, function(err) {
        if (err) throw err
        console.log('uploads completed')
        complete()
    })
}, { async: true })

file('build/bitcoin.otc.txt', function() {
    cp('-f', 'assets/bitcoin.otc.txt', 'build/')
})

file('build/index.html', function() {
    cp('-f', 'assets/index.html', 'build/')
})

task('build', [
    'build/styles.css',
    'build/index.html',
    'build/scripts.js',
    'build/bitcoin.otc.txt'
])

task('host', ['build'], function() {
    var express = require('express')
    , app = express()
    , server = require('http').createServer(app)
    app.use(express.static('build'))
    server.listen(5073)
    return server
})

task('clean', function() {
    rm('-Rf', 'build')
    rm('-Rf', 'tmp')
})
