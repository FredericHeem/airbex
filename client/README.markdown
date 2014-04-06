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
snow whoami               Show user information
snow showall              Show user information, balances, orders and transaction
snow balances             List balances
snow markets              List markets
snow orders               List my orders
snow depth <market>       List order depth. Example: snow depth BTCXRP
snow cancel <order id>    Cancel exchange order
snow cancelAll            Cancel all orders

Options:
  -u, --url  API url to use
  -k, --key  API key to use
```

Usage (node.js)
---

```javascript
var Snow = require('snow');
var config = {
  "key" : key,
  "url" : url
}
var client = new Snow(config);

// Get the user's information
client.whoami(function(err, user) {
    if (err) throw err
    console.log(client.createTableUser(user).toString())
});

// Get the user's balance
client.balances(function(err, balances) {
    if (err) throw err
    console.log(client.createTableBalances(balances).toString())
});   
         
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

// Cancel all orders
client.cancelAll(function(err, orderCancelled) {
    if (err) throw err
    console.log("#orderCancelled: %d", orderCancelled)
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

Testing
---

Install mocha, a testing framework:
```
npm install -g mocha
```

Edit the configuration file test/config/config.json 

Run all tests:
```
mocha
```

Run tests matching the name Markets:
```
mocha -g Markets
```


