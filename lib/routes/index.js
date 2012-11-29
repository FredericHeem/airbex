var fs = require('fs')
, path = require('path')
, debug = require('debug')('snow:routes')

module.exports = {
    configure: function(server) {
        fs.readdirSync(__dirname).forEach(function(fn) {
            if (fn == 'index.js') return
            debug('configuring route ' + fn)
            require('./' + fn).configure(server)
        })
    }
}