/* global task */
task('host', ['default'], function() {
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
            port: 6072
        })
    })
    proxy.listen(6073)
    app.use(express.static('build'))
    server.listen(6072)
    console.log('hosting at http://localhost:6073')
    return server
})
