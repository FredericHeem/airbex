process.env.DEBUG = '.*';
var _ = require('underscore')
, Backbone = require('backbone')
Backbone.$ = jQuery
$.support.cors = true

var app = require('./app')
// TODO: should be bootstrapped from index.js
app.apiUrl = window.location.hostname == 'localhost' ?
    'http://localhost:5073/api' :
    window.location.protocol + '//' + window.location.hostname + '/api'

// construct routers
var routes = {
    home: new (require('./routes/home')),
    login: new (require('./routes/login')),
    register: new (require('./routes/register')),
    markets: new (require('./routes/markets')),
    withdraw: new (require('./routes/withdraw')),
    deposit: new (require('./routes/deposit')),
    transfer: new (require('./routes/transfer')),
    user: new (require('./routes/user'))
}

var HeaderView = require('./views/HeaderView')
app.header = new HeaderView();
app.header.render();

app.cache = require('./app.cache')
app.cache.reload(function() {
    Backbone.history.start()
})
