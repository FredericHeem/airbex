snow client
=====

Installation
---

```
npm install -g snow-client
```

Usage (command line)
---

```
snow APIKEY               Write API key to config
snow url <url>            Write endpoint to config (debugging)
snow markets              List markets
snow orders               List my orders
snow depth <market>       List order depth. Example: snow depth BTCXRP
snow cancel <order id>    Cancel exchange order

Options:
  -u, --url  API url to use
  -k, --key  API key to use
```

Usage (node.js)
---

```javascript
var Snow = require('snow');
var client = new Snow('api key');

// Receive list of markets (includes bid, ask, last, high, low, volume)
client.markets(function(err, markets) {
    console.log(markets);
});

// Market depth
client.depth('BTCXRP', function(err, depth) {
    console.log(depth);
});

// My orders
client.orders(function(err, orders) {
    console.log(orders);
});

// Cancel an order by id
client.cancel(123, function(err) {
    if (!err) {
        console.log('Order was cancelled');
    }
});

// Create an order
client.order({
    market: 'BTCXRP',
    type: 'bid', // bid or ask
    price: '0.23', // must be string
    volume: '100.5' // must be string
}, function(err, id) {
    console.log('Order placed with id %d', id);
});

```
