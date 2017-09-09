---
category: Public
path: '/v1/markets'
title: 'Get markets summary'
type: 'GET'

layout: nil
---

This method retrieves the markets information

### Request

* No parameter is required

### Response

Sends back a collection of markets.

* **`id:`** is the id of the market.
* **`bc:`** is the base currency.
* **`qc:`** is the quote currency.
* **`last:`** is the last price traded.
* **`high:`** is the highest price in the last 24 hours.
* **`low:`** is the lowest price in the last 24 hours.
* **`bid:`** is the price of the highest bid.
* **`ask:`** is the price of the lowest ask.
* **`volume:`** is the volume of the last 24 hours.

```Status: 200 OK```


   
```{
[{
    "id": "BTCEUR",
    "bc": "BTC",
    "qc": "EUR",
    "last": "460.00000",
    "high": null,
    "low": null,
    "bid": "450.00000",
    "ask": "451.00000",
    "volume": null
}, {
    "id": "BTCUSD",
    "bc": "BTC",
    "qc": "USD",
    "last": "612.00000",
    "high": null,
    "low": null,
    "bid": "612.00000",
    "ask": "650.00000",
    "volume": null
}, {
    "id": "DOGEBTC",
    "bc": "DOGE",
    "qc": "BTC",
    "last": null,
    "high": null,
    "low": null,
    "bid": "0.00010000",
    "ask": null,
    "volume": null
}, {
    "id": "DRKBTC",
    "bc": "DRK",
    "qc": "BTC",
    "last": "0.00180000",
    "high": null,
    "low": null,
    "bid": "0.00180000",
    "ask": "0.00190000",
    "volume": null
}, {
    "id": "LTCBTC",
    "bc": "LTC",
    "qc": "BTC",
    "last": "0.01900000",
    "high": null,
    "low": null,
    "bid": "0.02000000",
    "ask": "0.02100000",
    "volume": null
}]
}
```

For errors responses, see the [response status codes documentation](#response-status-codes).