var Backbone = require('backbone');
Backbone.$ = jQuery;

mocha.globals([ 'script*' ])
mocha.setup('bdd')

require('./models')
require('./views');
