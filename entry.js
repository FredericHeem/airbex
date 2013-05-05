var markets = require('./controllers/markets')
, orders = require('./controllers/orders')
, balances = require('./controllers/balances')
, login = require('./controllers/login')
, activities = require('./controllers/activities')
, market = require('./controllers/market')
, api = require('./api')()
, router = require('./router')()
, $section = $('#section')
, $app = $('body')

router
.add(/markets$/, function() {
    var page = markets(api)
    $section.html(page.$el)
})
.add(/markets\/(.+)$/, function(id) {
    var page = market(api, id)
    $section.html(page.$el)
})
.add(/activities$/, function() {
    var page = activities(api)
    $section.html(page.$el)
})
.add(/login$/, function() {
    var page = login(api)
    $section.html(page.$el)
})
.add(/balances$/, function() {
    var page = balances(api)
    $section.html(page.$el)
})
.add(/orders$/, function() {
    var page = orders(api)
    $section.html(page.$el)
})

api.on('login', function(e, user) {
    $app.data('user', user).addClass('is-logged-in')
    $('.account-summary .email').html(user.email)
})

/*
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
*/
