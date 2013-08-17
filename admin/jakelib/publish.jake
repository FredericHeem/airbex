/* global task, jake, complete */
var common = require('./common')
, format = require('util').format

function publish(hostname, cb) {
    var files = {
        'build/head.js': 'head.js',
        'build/index.js': 'index.js',
        'build/vendor.js': 'vendor.js',
        'build/styles.css': 'styles.css',
        'build/index.html': 'index.html'
    }

    var cmds = []
    var baseDir = '/home/ubuntu/snow-admin/public/'
    var dirs = []

    cmds = cmds.concat(dirs.map(function(dir) {
        return 'ssh ubuntu@' + hostname + ' mkdir -p ' + baseDir + dir
    }))

    cmds = cmds.concat(Object.keys(files).map(function(fn) {
        var outName = files[fn] || fn
        return format('scp -C %s ubuntu@%s:%s%s', fn, hostname, baseDir, outName)
    }))

    jake.exec(cmds, { printStdout: true, printStderr: true }, cb)
}

// publishing
task('pp', ['publish-prod'])
task('publish-prod', function() {
    jake.Task['clean'].invoke()
    jake.Task['default'].invoke()

    publish('10.0.0.184', complete)
}, { async: true })

task('ps', ['publish-staging'])
task('publish-staging', function() {
    jake.Task['default'].on('complete', function() {
        publish('54.217.208.30', complete)
    })

    jake.Task['default'].invoke()

}, { async: true })
