---
category: 'Proof of Reserve'
path: '/v1/proof/asset/:currency'
title: 'Get the asset proof'
type: 'GET'

layout: nil
---

This method returns to asset proof which is composed of a list the exchange addresses in their possession alongside their signature with a particular message.

The signatures cryptographically prove the ownership of the addresses by the exchange. 

The message to sign contains a blockchain hash, and this is used to prove when the signature was created.

For more information about the proof of asset, please refer to the [proof of asset specification](https://github.com/olalonde/proof-of-assets)


### Request

* **`currency:`** the currency code, e.g `BTC`

### Response

Sends the asset proof.

```Status: 200 OK```

```{
    "currency": "BTC",
    "message": "Airbex Btc Asset",
    "blockhash": "000000000000000010cd86c9346a8c7c6b3babb5a440a9295b6ed6d00a328c8e",
    "signatures": [{
        "address": "1H7RFM1C5UCPSyoNwimhMa9Ntz82iib8uY",
        "signature": "G0ZG3Lz7mOwc2LD6Lf/3rNgPDMTUBqOQSHaKlv4x0AH+E17yfNnvUcEz/UdS2X4x/4Ji7bHKb+1j1u/rL9xGCNA="
    }, {
        "address": "1DsgBjnUHiuK2KGsiTfxbwwFTaabngvjmn",
        "signature": "HENBzklf4olJT+KE2QcH70GWpKfiNG2UjC9p7XshBTCMsP3YiGZzuDQxGR/2bN61PDBMZ2Wem0jvQpcRrahXpWw="
    }, {
        "address": "16BzmcweNGVGsc1yDYhPXmcZBYPMdKcaYP",
        "signature": "HGHXVRGiz4L+VlICaxHJshBaahpAm+lSp5SnvFNleJZUJSgF+Djry7VS2MM9EBfG/eW4/W0pTZ13QFE4MaCKtAw="
    }, {
        "address": "13xYGWCNobfCas29NxqgQRjqTmh2hUPedz",
        "signature": "G4CubIsbjQwYSY//hj+E1cOe0Bk/09LaNcu+Z+kiD6CqT4GKdWzODVuRteteZeIAon/JLQW4PYa+Ai6iPO6A1NQ="
    }, {
        "address": "16MbRvtoR4YosTHxns6VB9JSXw4s3xE6BP",
        "signature": "Hxz5DJhsDgVle426gWcRQdIFrkUJqzw+RUJBDa3eUfGsyI/GPstavUULG+bHVoGwe4TzTPtKhu6yCEYyNbTtcts=",
        "wallet": "hot"
    }, {
        "address": "1AeCLxN5C7qMawh6eCPutkVHryVvyhbGAD",
        "signature": "IAxoZLxePkB+hizO4MxVuPrQE4WnNJUfju/xCYM178Xq3x89MC3Yt2UPZrUdb3dQ5/BqIqF/R6YPG3IPF/2erS4=",
        "wallet": "hot"
    }, {
        "address": "1DehKj5dSHoH4WniDVMHV2jpAAPfUi3rS4",
        "signature": "H8hLa+rbjyMlTjBgY6Mix5P0UiV5qQRMXxM5UU2ItMgfezX6aEYlm6khHIivgnXkefnKFSBfa2oGx8YoEaU+by0=",
        "wallet": "hot"
    }]
}
```

For errors responses, see the [response status codes documentation](#response-status-codes).