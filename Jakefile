require('shelljs/global')
config.silent = true
var request = require('request')

var exec = function() {
    var result = global.exec.apply(this, arguments)
    if (result.code) throw new Error(result.output)
    return result.output
}

task('clean', function() {
    rm('-Rf', 'build/*')
})

task('app', [
    'build/head.js',
    'build/scripts.js',
    'build/styles.css',
    'build/index.html'
])

task('dist', [
    'build/head.min.js',
    'build/scripts.min.js',
    'build/styles.min.css',
    'build/index.min.html',
    'build/ripple.txt'
])

directory('build')

var head = [
    'build/raven.min.js'
]

var vendor = [
    'build/jquery.min.js',
    'build/sjcl.js',
    'build/alertify.min.js',
    'build/bootstrap.min.js'
]

file('build/jquery.min.js', ['components/jquery/jquery.min.js'], cpTask)
file('build/sjcl.js', ['vendor/sjcl.js'], cpTask)
file('build/alertify.min.js', ['vendor/alertify/alertify.min.js'], cpTask)
file('build/bootstrap.min.js', ['components/bootstrap/js/bootstrap.min.js'], cpTask)
file('build/ripple.txt', ['assets/ripple.txt'], cpTask)
file('build/raven.min.js', ['vendor/raven.min.js'], cpTask)

function cpTask() {
    cp(this.prereqs[0], this.name)
}

file('build/scripts.min.js', ['build/scripts.js'], compressJs)
file('build/head.min.js', ['build/head.js'], compressJs)
file('build/styles.min.css', ['build/styles.css'], compressCss)

file('build/index.html', ['build'], function() {
    var ejs = require('ejs')
    ejs.render(cat('assets/index.ejs'), {
        minifyHead: false,
        minifyScripts: false,
        minifyCss: false,
        segment: '70kmerb0ik'
    })
    .to(this.name)
})

file('build/index.min.html', ['build'], function() {
    var ejs = require('ejs')
    ejs.render(cat('assets/index.ejs'), {
        minifyHead: true,
        minifyScripts: false,
        minifyCss: true,
        segment: 'bc0p8b3ul1'
    })
    .to(this.name)
})

file('build/styles.css', ['build'], function() {
    exec('stylus assets/app.styl -o build');
    (cat('components/bootstrap/css/bootstrap.min.css') + '\n' +
    cat('components/bootstrap/css/bootstrap-responsive.min.css') + '\n' +
    cat('vendor/alertify/alertify.bootstrap.css') + '\n' +
    cat('vendor/alertify/alertify.bootstrap.css') + '\n' +
    cat('build/app.css') + '\n')
    .to(this.name)
})

file('build/scripts.js', ['build'].concat(vendor), function() {
    var v = vendor.reduce(function(p, c) {
        return p + ';' + cat(c)
    }, '')
    , bundle = exec('browserify -d -t ./node_modules/browserify-ejs ./entry.js')
    , scripts = v + ';' + bundle
    scripts.to(this.name)
})

file('build/head.js', ['build'].concat(head), function() {
    head.reduce(function(p, c) {
        return p + ';' + cat(c)
    }, '')
    .to(this.name)
})

function compressCss() {
    var inputFn = this.name.replace(/min\.css$/, 'css')
    exec('cleancss ' + inputFn).to(this.name)
}

function compressJs() {
    var inputFn = this.name.replace(/min\.js$/, 'js')
    exec('uglifyjs ' + inputFn + ' --compress warnings=false --mangle').to(this.name)
}

// hosting locally
task('host', ['app'], function() {
    var express = require('express')
    , app = express()
    , server = require('http').createServer(app)
    , proxy = require('http-proxy').createServer(function(req, res, proxy) {
        if (req.url.match(/^\/api\//)) {
            // remove /api prefix
            req.url = req.url.substr(4)
            return proxy.proxyRequest(req, res, {
                host: 'localhost',
                port: 5071
            })
        }
        proxy.proxyRequest(req, res, {
            host: 'localhost',
            port: 5072
        })
    })
    proxy.listen(5073)
    app.use(express.static('build'))
    server.listen(5072)
    console.log('hosting at http://localhost:5073')
    return server
})

// publishing
task('pp', ['publish-prod'])
task('publish-prod', [
    'clean', 'dist'
], function() {
    var async = require('async')
    , files = {
        'head.min.js': null,
        'scripts.js': null,
        'styles.min.css': null,
        'index.min.html': 'index.html',
        'ripple.txt': 'ripple.txt'
    }

    async.forEach(Object.keys(files), function(fn, next) {
        var outName = files[fn] || fn
        , cmd = 'scp build/' + fn + ' ubuntu@54.228.224.255:/home/ubuntu/snow-web/public/' + outName
        jake.exec(cmd, { printStdout: true, printStderr: true }, next)
    }, function(err) {
        if (err) return complete(err)
        exec('npm version patch', { silent: false })
        complete()
    })
}, { async: true })

// testing
var server

task('test', ['test-host'], function() {
    jake.exec('mocha-phantomjs -R spec http://localhost:5074/test.html', function(res) {
        server.close()
        complete()
    }, {
        printStdout: true
    })
}, { async: true })

file('build/test.html', ['test/support/tests.html'], cpTask)
file('build/test.css', ['node_modules/mocha/mocha.css'], cpTask)

cp('-f', 'test/support/tests.html', 'build/test/index.html')

task('test-host', ['build/test.js', 'build/test.html'], function() {
    var express = require('express')
    , app = express()
    server = require('http').createServer(app)
    app.use(express.static('build'))
    server.listen(5074)
})

file('build/test.js', ['build'].concat(vendor), function() {
    var deps = vendor.slice()
    deps.push('./node_modules/mocha/mocha.js')

    var v = deps.reduce(function(p, c) {
        return p + ';' + cat(c)
    }, '')
    , bundle = exec('browserify -d -t ./node_modules/browserify-ejs ./test/index.js')
    , scripts = v + ';' + bundle
    scripts.to(this.name)
})

task('default', ['clean', 'app'])
