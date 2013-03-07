var Backbone = require('backbone');
Backbone.$ = jQuery;

mocha.globals([ 'script*' ])

require('./models')
require('./views');
