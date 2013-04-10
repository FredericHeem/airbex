require('shelljs/global')
config.silent = true
var request = require('request')

var exec = function() {
    var result = global.exec.apply(this, arguments)
    if (result.code) throw new Error(result.output)
    return result.output
}

task('clean', function() {
    rm('-Rf', 'public')
})

task('app', ['public/scripts.js', 'public/styles.css', 'public/index.html'])
task('dist', ['public/scripts.min.js', 'public/styles.min.css', 'public/index.html'])

directory('public')

var vendor = ['public/jquery-1.9.1.min.js', 'public/sjcl.js', 'public/alertify.js', 'public/bootstrap.min.js']

file('public/jquery-1.9.1.min.js', ['vendor/jquery-1.9.1.min.js'], function() {
    cp(this.prereqs[0], this.name)
})

file('public/jquery-1.9.1.min.js', ['vendor/jquery-1.9.1.min.js'], cpTask)
file('public/sjcl.js', ['vendor/sjcl.js'], cpTask)
file('public/alertify.js', ['vendor/alertify.js'], cpTask)
file('public/bootstrap.min.js', ['vendor/bootstrap.min.js'], cpTask)

function cpTask() {
    cp(this.prereqs[0], this.name)
}

file('public/scripts.min.js', ['public/scripts.js'], compressJs)
file('public/styles.min.css', ['public/styles.css'], compressCss)

file('public/index.html', function() {
    cp('assets/index.html', this.name)
})

file('public/styles.css', ['public'], function() {
    (cat('vendor/bootstrap-combined.min.css') +
    exec('lessc assets/styles.less'))
    .to(this.name)
})

file('public/scripts.js', ['public'].concat(vendor), function() {
    var v = vendor.reduce(function(p, c) {
        return p + ';' + cat(c)
    }, '')
    , bundle = exec('browserify -t ./node_modules/browserify-ejs ./lib/client/entry.js')
    , scripts = v + ';' + bundle
    scripts.to(this.name)
})

function compressCss() {
    var inputFn = this.name.replace(/min\.css$/, 'css')
    exec('cleancss ' + inputFn).to(this.name)
}

function compressJs() {
    var inputFn = this.name.replace(/min\.js$/, 'js')
    exec('uglifyjs ' + inputFn + ' --compress --mangle').to(this.name)
}

// hosting locally
task('host', [
    'app'
], function() {
    var express = require('express')
    , app = express()
    , server = require('http').createServer(app)
    app.use(express.static('public'))
    server.listen(5073)
    return server
})

// publishing
task('pp', ['publish-prod'])
task('publish-prod', [
    'app'
], function() {
    var async = require('async')
    , files = [
        'scripts.js',
        'styles.css',
        'index.html'
    ]

    async.forEach(files, function(fn, next) {
        jake.exec('scp public/' + fn + ' ubuntu@54.228.224.255:/home/ubuntu/snow-web/public/', next)
    }, complete)
}, { async: true })

// testing
task('test', ['test-node', 'test-browser'])

task('test-node', function() {
    jake.exec('mocha -R spec', { printStderr: true, printStdout: true })
})

var server

task('test-browser', ['test-browser-host'], function() {
    jake.exec('mocha-phantomjs -R spec http://localhost:5074/test.html', function(res) {
        server.close()
        complete()
    }, {
        printStdout: true
    })
}, { async: true })

file('public/test.html', ['test/support/tests.html'], cpTask)
file('public/test.css', ['node_modules/mocha/mocha.css'], cpTask)

cp('-f', 'test/support/tests.html', 'build/test/index.html')

task('test-browser-host', ['public/test.js', 'public/test.html'], function() {
    var express = require('express')
    , app = express()
    server = require('http').createServer(app)
    app.use(express.static('public'))
    server.listen(5074)
})

file('public/test.js', ['public'].concat(vendor), function() {
    var deps = vendor.slice()
    deps.push('./node_modules/mocha/mocha.js')

    var v = deps.reduce(function(p, c) {
        return p + ';' + cat(c)
    }, '')
    , bundle = exec('browserify -t ./node_modules/browserify-ejs ./test/client/index.js')
    , scripts = v + ';' + bundle
    scripts.to(this.name)
})
