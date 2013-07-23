/* global cat, cp */
require('shelljs/global')
var fs = require('fs')

exports.compressCss = function() {
    var inputFn = this.name.replace(/min\.css$/, 'css')
    exports.exec('cleancss ' + inputFn).to(this.name)
}

exports.compressJs = function() {
    var inputFn = this.name.replace(/min\.js$/, 'js')
    exports.exec('uglifyjs ' + inputFn + ' --compress warnings=false --mangle')
    .to(this.name)
}

exports.exec = function() {
    var result = global.exec.apply(this, arguments)
    if (result.code) throw new Error(result.output)
    return result.output
}

exports.concatFiles = function() {
    var delim = this.prereqs[0].match(/.js$/i) ? ';' : '\n'

    this.prereqs.reduce(function(p, c) {
        return p + delim + cat(c)
    }, '')
    .to(this.name)
}

exports.copy = function() {
    console.log(this.prereqs[0] + ' --> ' + this.name)
    if (!fs.existsSync(this.prereqs[0])) {
        throw new Error('File not found ' + this.prereqs[0])
    }
    cp(this.prereqs[0], this.name)
}
