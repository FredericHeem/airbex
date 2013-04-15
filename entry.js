process.env.DEBUG = '.*';
var _ = require('underscore')
, Backbone = require('backbone')

var app = require('./app')
// TODO: should be bootstrapped from index.js
app.api.url = window.location.hostname == 'localhost' ? 'http://localhost:5071' : 'https://api.snowco.in'

// construct routers
var routes = _.reduce(require('./routes'), function(p, v, k) {
    p[k] = new v
    return p
}, {})

Backbone.history.start()
