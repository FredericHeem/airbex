---
category: 'Proof of Reserve'
path: '/v1/proof/liability/:currency'
title: 'Get the liability partial tree'
type: 'GET'

layout: nil
---

This method returns to liability partial tree of the user for the given cryptocurrency.

For a description of the response, please have a look at the [proof of liability specification](https://github.com/olalonde/proof-of-liabilities)

### Request

* **`currency:`** the currency code, e.g `BTC`

### Response

Sends the root liability.

```Status: 200 OK```

```{
    "id": "0 BTC liabilities",
    "partial_tree": {
        "left": {
            "left": {
                "left": {
                    "data": {
                        "sum": "0",
                        "hash": "23424cd1601dd9e827be77d2026f3d1846d18ba69cd32d47db0b41578bd58570"
                    }
                },
                "right": {
                    "left": {
                        "left": {
                            "data": {
                                "sum": "0",
                                "hash": "28b0f92d84e7727218a8b0a54c63e8facbfd512ee534996578d34dea3bd003fe"
                            }
                        },
                        "right": {
                            "data": {
                                "user": "frederic.heem@gmail.com",
                                "sum": "3.45898099",
                                "nonce": "2a644219e77147c24ace672675c51528"
                            }
                        }
                    },
                    "right": {
                        "data": {
                            "sum": "0",
                            "hash": "ea20139a00a7b56822081b77cc99588c0db322a03f39da70bb65159b65e2706d"
                        }
                    }
                }
            },
            "right": {
                "data": {
                    "sum": "4",
                    "hash": "f0ae10bec263268a988e5067968215ac8285bafbb6341d186e6be8cc7ff9e58d"
                }
            }
        },
        "right": {
            "data": {
                "sum": "0",
                "hash": "821b596965b93fafa8a5d76ec979777eee43d18d3b19a971a8d2b266aa917192"
            }
        }
    }
}
```

For errors responses, see the [response status codes documentation](#response-status-codes).