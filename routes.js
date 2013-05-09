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
, $app = $('body')

module.exports = function(app, api, router) {
    var $section = $('#section')

    router
    .add(/^$/, function() {
        $section.html(home().$el)
    })
    .add(/^markets$/, function() {
        $section.html(markets(app, api).$el)
    })
    .add(/^markets\/(.+)$/, function(id) {
        $section.html(market(app, api, id).$el)
    })
    .add(/^activities$/, function() {
        $section.html(activities(app, api).$el)
    })
    .add(/^register$/, function() {
        $section.html(register(app, api).$el)
        $app.addClass('is-section-register')
    })
    .add(/^login(?:\?after=(.+))?$/, function(after) {
        $section.html(login(app, api, after).$el)
    })
    .add(/^orders$/, function() {
        if (!app.authorize()) return
        $section.html(orders(app, api).$el)
    })
    .add(/^withdrawbtc$/, function() {
        if (!app.authorize()) return
        $section.html(withdrawbtc(app, api).$el)
    })
    .add(/^withdrawltc$/, function() {
        if (!app.authorize()) return
        $section.html(withdrawltc(app, api).$el)
    })
    .add(/^withdrawripple$/, function() {
        if (!app.authorize()) return
        $section.html(withdrawripple(app, api).$el)
    })
    .add(/^dashboard$/, function() {
        if (!app.authorize()) return
        $section.html(dashboard(app, api).$el)
    })
    .add(/^depositbtc$/, function() {
        if (!app.authorize()) return
        $section.html(depositbtc(app, api).$el)
    })
    .add(/^depositltc$/, function() {
        if (!app.authorize()) return
        $section.html(depositltc(app, api).$el)
    })
    .add(/^(.+)$/, function(hash) {
        $section.html(notfound(hash).$el)
    })
}
