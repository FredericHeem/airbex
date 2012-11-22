var express = require('express')
, app = express();

require('../test/support/phantom-app.js')(app);
app.listen(5075, '127.0.0.1');