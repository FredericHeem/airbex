var markets = require('./controllers/markets')
, home = require('./controllers/home')
, orders = require('./controllers/orders')
, withdrawbtc = require('./controllers/withdrawbtc')
, withdrawltc = require('./controllers/withdrawltc')
, withdrawripple = require('./controllers/withdrawripple')
, login = require('./controllers/login')
, register = require('./controllers/register')
, activities = require('./controllers/activities')
, market = require('./controllers/market')
, notfound = require('./controllers/notfound')
, dashboard = require('./controllers/dashboard')
, depositbtc = require('./controllers/depositbtc')
, depositltc = require('./controllers/depositltc')
, adminBalances = require('./controllers/admin/balances')
, adminWithdraws = require('./controllers/admin/withdraws')
, adminCredit = require('./controllers/admin/credit')
, $app = $('body')

function section(name) {
    $app[0].className.split(/\s+/).forEach(function(name) {
        if (!/is-section-/.test(name)) return
        $app.removeClass(name)
    })
    $app.addClass('is-section-' + name)
}

module.exports = function(app, api, router) {
    var $section = $('#section')

    router
    .add(/^$/, function() {
        $section.html(home().$el)
        section('home')
    })
    .add(/^markets$/, function() {
        $section.html(markets(app, api).$el)
        section('markets')
    })
    .add(/^markets\/(.+)$/, function(id) {
        $section.html(market(app, api, id).$el)
        section('market')
    })
    .add(/^activities$/, function() {
        $section.html(activities(app, api).$el)
        section('activities')
    })
    .add(/^register$/, function() {
        $section.html(register(app, api).$el)
        section('register')
    })
    .add(/^login(?:\?after=(.+))?$/, function(after) {
        $section.html(login(app, api, after).$el)
        section('login')
    })
    .add(/^orders$/, function() {
        if (!app.authorize()) return
        $section.html(orders(app, api).$el)
        section('orders')
    })
    .add(/^withdrawbtc$/, function() {
        if (!app.authorize()) return
        $section.html(withdrawbtc(app, api).$el)
        section('withdrawbtc')
    })
    .add(/^withdrawltc$/, function() {
        if (!app.authorize()) return
        $section.html(withdrawltc(app, api).$el)
        section('withdrawltc')
    })
    .add(/^withdrawripple$/, function() {
        if (!app.authorize()) return
        $section.html(withdrawripple(app, api).$el)
        section('withdrawripple')
    })
    .add(/^dashboard$/, function() {
        if (!app.authorize()) return
        $section.html(dashboard(app, api).$el)
        section('dashboard')
    })
    .add(/^depositbtc$/, function() {
        if (!app.authorize()) return
        $section.html(depositbtc(app, api).$el)
        section('depositbtc')
    })
    .add(/^depositltc$/, function() {
        if (!app.authorize()) return
        $section.html(depositltc(app, api).$el)
        section('depositltc')
    })
    .add(/^admin\/balances$/, function() {
        if (!app.authorize()) return
        $section.html(adminBalances(app, api).$el)
        section('admin-balances')
    })
    .add(/^admin\/withdraws$/, function() {
        if (!app.authorize()) return
        $section.html(adminWithdraws(app, api).$el)
        section('admin-withdraws')
    })
    .add(/^admin\/credit$/, function() {
        if (!app.authorize()) return
        $section.html(adminCredit(app, api).$el)
        section('admin-credit')
    })
    .add(/^(.+)$/, function(hash) {
        $section.html(notfound(hash).$el)
        section('notfound')
    })
}
