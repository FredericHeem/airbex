/* global file, directory, task, cat */
var base = 'build'
, common = require('./common')

directory(base)
directory(base + '/img')
directory(base + '/img/flags')

var head = [
    'vendor/raven.min.js',
    'vendor/modernizr.js'
]

var vendor = [
    'components/jquery/jquery.min.js',
    'vendor/jquery.cookie.js',
    'vendor/sjcl.js',
    'components/alertify/alertify.min.js',
    'vendor/bootstrap/js/bootstrap.min.js',
    'components/bootstrap-notify/js/bootstrap-notify.js'
]

task('dist', [
    'admin',
    base + '/head.min.js',
    base + '/index.min.js',
    base + '/styles.min.css',
    base + '/index.min.html',
    base + '/vendor.min.js'
])

task('admin', [
    base,
    base + '/head.js',
    base + '/index.js',
    base + '/vendor.js',
    base + '/styles.css',
    base + '/index.html'
])

file(base + '/head.js', head, common.concatFiles)
file(base + '/vendor.js', vendor, common.concatFiles)

file(base + '/index.min.js', [base + '/index.js'], common.compressJs)
file(base + '/vendor.min.js', [base + '/vendor.js'], common.compressJs)
file(base + '/head.min.js', [base + '/head.js'], common.compressJs)
file(base + '/styles.min.css', [base + '/styles.css'], common.compressCss)

file(base + '/index.html', function() {
    var ejs = require('ejs')
    ejs.render(cat('controllers/index.ejs'), {
        minify: false,
        segment: process.env.SEGMENT,
        timestamp: +new Date(),
        bucket: process.env.BUCKET
    })
    .to(this.name)
})

file(base + '/index.min.html', function() {
    var ejs = require('ejs')
    ejs.render(cat('controllers/index.ejs'), {
        minify: false,
        segment: process.env.SEGMENT,
        timestamp: +new Date(),
        bucket: process.env.BUCKET
    })
    .to(this.name)
})

file(base + '/index.css', function() {
    common.exec('stylus controllers/index.styl -o ' + base)
})

file(base + '/styles.css', [
    'components/alertify/themes/alertify.core.css',
    'components/alertify/themes/alertify.bootstrap.css',
    'vendor/bootstrap/css/bootstrap.min.css',
    'vendor/bootstrap/css/bootstrap-responsive.min.css',
    'components/bootstrap-notify/css/bootstrap-notify.css',
    'build/index.css'
], common.concatFiles)

file(base + '/index.js', ['build'].concat(vendor), function() {
    var bundle = common.exec('browserify -d -t ./node_modules/browserify-ejs ./index.js')
    bundle.to(this.name)
})
