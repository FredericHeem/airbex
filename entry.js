process.env.DEBUG = '.*';
var _ = require('underscore')
, Backbone = require('backbone')
Backbone.$ = jQuery

var app = require('./app')
// TODO: should be bootstrapped from index.js
app.api.url = window.location.hostname == 'localhost' ? 'http://localhost:5071' : 'https://api.snowco.in'

// construct routers
var routes = {
    home: new (require('./routes/home')),
    login: new (require('./routes/login')),
    register: new (require('./routes/register')),
    books: new (require('./routes/books')),
    withdraw: new (require('./routes/withdraw')),
    deposit: new (require('./routes/deposit')),
    transfer: new (require('./routes/transfer')),
    user: new (require('./routes/user'))
}

app.header = new Views.HeaderView();
app.header.render();

app.cache = require('./app.cache')
app.cache.reload(function() {
    Backbone.history.start()
})
