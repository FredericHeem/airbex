# API v1

# Schema

All data is sent and received as [JSON][rfc4627].

```
curl -i http://localhost:5073/api/v1/markets
HTTP/1.1 200 OK
x-powered-by: Express
content-type: application/json; charset=utf-8
content-length: 523
date: Sun, 04 Aug 2013 13:13:18 GMT

connection: keep-alive

[
  {
    "id": "BTCLTC",
    "last": "0.000",
    "high": "0.000",
    "low": "0.000",
    "bid": "0.000",
    "ask": "0.000",
    "volume": "0.00000",
    "scale": 3
  }
]
```

Blank fields are included as `null` instead of being omitted.

All timestamps are returned in ISO 8601 format:

`YYYY-MM-DDTHH:MM:SSZ`

## Parameters

Several API methods take optional parameters:

```
curl http://localhost:5073/api/v1/activities?since=115
[
  {
    "type": "FillOrder",
    "id": 116,
    "created": "2013-08-03T13:53:35.416Z",
    "details": {
      "market": "BTCNOK",
      "total": "137.50000000",
      "original": "0.25000",
      "type": "ask",
      "price": "550.000"
    }
  },
  {
    "type": "CreateOrder",
    "id": 117,
    "created": "2013-08-03T13:53:35.420Z",
    "details": {
      "market": "BTCNOK",
      "type": "ask",
      "price": "550",
      "amount": "0.25",
      "aon": false
    }
  }
```

## Client errors

Client errors are returned with status codes `4xx` and `5xx`:

```
curl -i http://localhost:5073/api/v1/orders
HTTP/1.1 401 Unauthorized
x-powered-by: Express
content-type: application/json; charset=utf-8
content-length: 82
date: Sun, 04 Aug 2013 13:31:53 GMT
connection: keep-alive

{
  "name": "KeyMissing",
  "message": "key parameter missing from query string"
}
```

Requests and responses are provided as `application/json` (see [RFC4627][rfc4627])

# Authentication

Methods that

Private API calls require an API key to be provided as a query parameter.

```
curl http://localhost:5073/api/v1/whoami?key=6827193b5418f481f6c7a79633845330c9ebb12ec30088c06d84ecd78848e9eb
{
  "id": 55,
  "email": "a@abrkn.com",
  "admin": true,
  "tag": 224135787,
  "phone": "+4712345678",
  "firstName": "Andreas",
  "lastName": "Brekken",
  "address": "Funnyville 2",
  "emailVerified": true,
  "country": "NO",
  "postalArea": "1234",
  "city": "Oslo",
  "language": "nb-NO"
}
```

# Account

## Get balances

`GET /v1/balances`

### Authorize

- Private: Yes
- Permissions: None

### Response

```
Status: 200 OK

[
  {
    "currency": "BTC",
    "balance": "6.64500000",
    "hold": "0.00020000",
    "available": "6.64480000"
  },
  {
    "currency": "XRP",
    "balance": "0.000000",
    "hold": "0.000000",
    "available": "0.000000"
  },
  {
    "currency": "NOK",
    "balance": "1044.87500",
    "hold": "354.48050",
    "available": "690.39450"
  },
  {
    "currency": "LTC",
    "balance": "1.00000000",
    "hold": "0.00000000",
    "available": "1.00000000"
  }
]
```

# Bitcoin

## Get deposit address

`GET /v1/BTC/address`

### Authorization

- Private: Yes
- Permissions: Deposit

### Response

```
{
  "address": "141E84pDNfEGmG4rHnHt4Fra9f7wMNKddS"
}
```

## Withdraw Bitcoin

`POST /v1/BTC/out`

### Authorization

- Private: Yes
- Permissions: Withdraw

### Input

#### address

*Required* **string** Destination Bitcoin address

#### amount

*Required* **string** Amount of BTC to withdraw

### Response

```
Status: 201 Created

{
  "id": 7
}
```

# Litecoin

## Get deposit address

`GET /v1/LTC/address`

### Authorization

- Private: Yes
- Permissions: Deposit

### Response

```
{
  "address": "L41E84pDNfEGmG4rHnHt4Fra9f7wMNKddS"
}
```

## Withdraw Litecoin

`POST /v1/LTC/out`

### Authorization

- Private: Yes
- Permissions: Withdraw

### Input

#### address

*Required* **string** Destination Litecoin address

#### amount

*Required* **string** Amount of LTC to withdraw

### Response

```
Status: 201 Created

{
  "id": 9
}
```

# Ripple

## Get deposit address

`GET /v1/ripple/address`

### Authorization

- Private: No

### Response

```
Status: 200 OK

{
  "address": "rJHygWcTLVpSXkowott6kzgZU6viQSVYM1"
}
```

## Withdraw to Ripple

`POST /v1/ripple/out`

### Authorization

- Private: Yes
- Permissions: Withdraw

### Input

#### address

*Required* **string** Destination Ripple address

#### amount

*Required* **string** Amount to withdraw

#### currency

*Required* **string** Currency to withdraw

### Response

```
Status: 201 Created

{
  "id": 11
}
```

## Get trust of address

`GET /v1/ripple/trust/:account`

### Authorization

Private: No

### Parameters

#### account

*Required* **string** account to look up trust for

### Response

```
Status: 200 OK

{
  "BTC": {
    "limit": "0.123",
    "balance": "0.123"
  },
  "LTC": {
    "limit": "0.123",
    "balance": "0.123"
  }
}
```

# Markets

## List markets

´´´
Status: 200 OK

`GET /v1/markets`

### Response

´´´´
[
  {
    "id": "BTCLTC",
    "last": "0.000",
    "high": "0.000",
    "low": "0.000",
    "bid": "0.000",
    "ask": "0.000",
    "volume": "0.00000",
    "scale": 3
  },
  {
    "id": "BTCNOK",
    "last": "550.000",
    "high": "550.000",
    "low": "550.000",
    "bid": "550.000",
    "ask": "0.000",
    "volume": "0.85000",
    "scale": 3
  },
  {
    "id": "BTCXRP",
    "last": "0.000",
    "high": "0.000",
    "low": "0.000",
    "bid": "0.000",
    "ask": "0.000",
    "volume": "0.00000",
    "scale": 3
  }
]
´´´

## Get market depth

´GET /v1/markets/:market/depth´

### Parameters

#### market

*Required* **string** id of the market, for example BTCNOK

### Response

´´´
Status: 200 OK

{
    "bids": [
        [
            "568.299",
            "0.50000"
        ],
        [
            "565.443",
            "1.00000"
        ]
    ],
    "asks": [
        [
            "623.000",
            "1.00000"
        ],
        [
            "624.000",
            "0.18674"
        ]
    ]
}
´´´

The inner array is ´[price, volume]´

# Orders

## List orders

´GET /v1/orders´

## Authorization

Private: Yes
Permissions: None

TODO

## Create order

´POST /v1/orders´

### Authorization

Private: Yes
Permissions: Trade

### Input

#### market

*Required* **string** id of market (like BTCLTC)

#### type

*Required* **string** ´bid´ or ´ask´ (bid means buy, ask means sell)

#### price

*Optional* **string** unit price. If omitted, order becomes a market order

#### amount

*Required* **string** amount to order

#### aon

*Optional* **boolean** whether to make limit order all-or-nothing (only execute if the entire order can be filled immediately)

### Response

TODO

## Cancel an order

´DELETE /v1/orders/:order´

### Parameters

#### order

*Required* Unique id of the order to cancel

### Authorization

Private: Yes
Permissions: Trade

[rfc4627]: http://tools.ietf.org/html/rfc4627
