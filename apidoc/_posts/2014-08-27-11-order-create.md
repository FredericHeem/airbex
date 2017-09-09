---
category: Authenticated
path: '/v1/order'
title: 'Create an order'
type: 'POST'

layout: nil
---

This method creates an order on the given market

### Request

* **`amount:`** The amount of base currency to buy or sell.
* **`market:`** The market id where the order will be placed, e.g `BTCUSD`.
* **`price:`** The price in quote currency at which to buy or sell. `null` for instant order.
* **`type:`** `bid`: buy order, `ask`: sell order.

```{
  amount: "0.1",
  market: "BTCUSD",
  price: "614",
  type: "ask"
}
```

### Response

Sends the order id.

* **`id:`** The order id.

```Status: 201 Created```

```{"id":182}
```

For errors responses, see the [response status codes documentation](#response-status-codes).