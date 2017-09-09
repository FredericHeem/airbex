---
category: Public
path: '/v1/currencies'
title: 'Get currencies information'
type: 'GET'

layout: nil
---

This method retrieves the list of currencies

### Request

* No parameter is required

### Response

Sends back a collection of currencies supported by the exchange.

* **`id:`** is the id of the currency.
* **`fiat:`** false for cryptocurrencies.
* **`scale:`** is the scale of currency, i.e the number of digits.
* **`scale_display:`** is the scale to display the currency.
* **`name:`** is the firendly name of the currency.
* **`withdraw_min:`** the minimum amount to withdraw.
* **`withdraw_max:`** the maximun amount to withdraw.
* **`withdraw_fee:`** fees for withdraw, these fees goes for either the miners or the bank.
* **`conf_time:`** the cryptocurrency confirmation time which is the average duration time between blocks.
* **`min_conf:`** the minimum of confirmations to credit the deposit.


```Status: 200 OK```

   
```[{
    "id": "BTC",
    "fiat": false,
    "scale": 8,
    "scale_display": 6,
    "name": "Bitcoin",
    "withdraw_min": "0.00100000",
    "withdraw_max": "10.00000000",
    "withdraw_fee": "0.00010000",
    "conf_time": 600,
    "min_conf": 2
}, {
    "id": "CZK",
    "fiat": true,
    "scale": 5,
    "scale_display": 0,
    "name": "Czech Crown",
    "withdraw_min": "1.00000",
    "withdraw_max": "50000.00000",
    "withdraw_fee": "0.10000",
    "conf_time": 600,
    "min_conf": 6
}, {
    "id": "DOGE",
    "fiat": false,
    "scale": 8,
    "scale_display": 0,
    "name": "Dogecoin",
    "withdraw_min": "1.00000000",
    "withdraw_max": "10000000.00000000",
    "withdraw_fee": "1.00000000",
    "conf_time": 60,
    "min_conf": 10
}, {
    "id": "DRK",
    "fiat": false,
    "scale": 8,
    "scale_display": 3,
    "name": "Darkcoin",
    "withdraw_min": "0.00100000",
    "withdraw_max": "100.00000000",
    "withdraw_fee": "0.00100000",
    "conf_time": 150,
    "min_conf": 4
}, {
    "id": "EUR",
    "fiat": true,
    "scale": 5,
    "scale_display": 2,
    "name": "Euro",
    "withdraw_min": "1.00000",
    "withdraw_max": "50000.00000",
    "withdraw_fee": "0.10000",
    "conf_time": 600,
    "min_conf": 6
}, {
    "id": "LTC",
    "fiat": false,
    "scale": 8,
    "scale_display": 3,
    "name": "Litecoin",
    "withdraw_min": "0.00100000",
    "withdraw_max": "10.00000000",
    "withdraw_fee": "0.00100000",
    "conf_time": 150,
    "min_conf": 4
}, {
    "id": "USD",
    "fiat": true,
    "scale": 5,
    "scale_display": 2,
    "name": "US Dollar",
    "withdraw_min": "1.00000",
    "withdraw_max": "50000.00000",
    "withdraw_fee": "0.10000",
    "conf_time": 600,
    "min_conf": 6
}]
```

For errors responses, see the [response status codes documentation](#response-status-codes).