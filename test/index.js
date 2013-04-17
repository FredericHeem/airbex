var Backbone = require('backbone');
Backbone.$ = jQuery;

mocha.globals([ 'script*' ])
mocha.setup('bdd')

require('./app')
require('./models')
require('./views');
