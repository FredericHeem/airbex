---
category: 'Proof of Reserve'
path: '/v1/proof/root/:currency'
title: 'Get the root liability'
type: 'GET'

layout: nil
---

This method returns to root liability for the given cryptocurrency.

For more information about the root liability, please refer to the [proof of liability specification](https://github.com/olalonde/proof-of-liabilities)


### Request

* **`currency:`** the currency code, e.g `BTC`

### Response

Sends the root liability.

* **`sum:`** The total balance.
* **`hash:`** The hash of the user's balance merkle tree.
* **`currency:`** The currency code.
* **`timestamp:`** The unix timestamp.

```Status: 200 OK```

```{
    "root": {
        "sum": "7.45898099",
        "hash": "ef129eb0b44b2635486d491242a31e1f37aceb664a421722d5092a9c528ef907"
    },
    "currency": "BTC",
    "timestamp": 1409136916181
}
```

For errors responses, see the [response status codes documentation](#response-status-codes).