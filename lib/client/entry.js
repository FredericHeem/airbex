process.env.DEBUG = '.*';
var Router = require('./Router')
, app = require('./app')
, router = new Router;

console.log('app in entry', app)
app.router = router;
console.log('app in entry a', app)
