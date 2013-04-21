snow
=====

The API is accessible from [https://snowco.in/api]

Security
---

Private methods require the user to be authenticated. This is done by sending two extra headers:
`snow-key` and `snow-sign`

This is the signing method:

```
function sign(form, secret) {
    var body = JSON.stringify(form || {}) + secret
    , bits = sjcl.hash.sha256.hash(body)
    return sjcl.codec.base64.fromBits(bits)
}
```

Methods
---


