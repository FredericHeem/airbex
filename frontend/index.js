var debug = require('./helpers/debug')('entry')
require('./helpers/framekiller')()

debug('initializing shared components')

window.config = require('./config/config.js')()
window.$app = $('body')
window.router = require('./helpers/router')
window.api = require('./api')
var App = require('./app')
var app = new App()
window.errors = require('./errors')
window.i18n = require('./i18n')
window.numbers = require('./helpers/numbers')
window.formatters = require('./helpers/formatters')
window.moment = require('moment')
//window.autologout = require('./helpers/autologout')()
window.loading = require('./helpers/loading')()

app.start()
window.app = app;

debug('shared components inited')

i18n.detect()

require('./helpers/jquery')
require('./routes.js')()
//require('./helpers/intercom')

if (window.analytics) {
    require('./segment')
}

api.cryptoAddress = []

$app.on('click', 'a[href="#set-language"]', function(e) {
    e.preventDefault()
    i18n.set($(this).attr('data-language'))
})

debug('boostrapping...')

var master = require('./modules/master')
master.render()

