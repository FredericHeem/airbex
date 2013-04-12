process.env.DEBUG = '.*';

var Router = require('./Router')
, app = require('./app')
app.api.url = window.location.hostname == 'localhost' ? 'http://localhost:5071' : 'https://api.snowco.in'

var router = new Router;

app.router = router;
