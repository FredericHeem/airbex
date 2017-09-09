---
title: 'Response status codes'

layout: nil
---

### Success

Successes differ from errors in that their body may not be a simple response object with a code and a message. The headers however are consistent across all calls:

* `GET`, `PUT`, `DELETE` returns `200 OK` on success,
* `DELETE` returns `202 No Content` on success,
* `POST ` returns 201 on success,

### Error

Error responses are simply returning [standard HTTP error codes](http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html) along with some additional information:

* The error code is sent back as a status header,
* The body includes an object describing both the code and message (for debugging and/or display purposes),

For a call with an missing API key for example:

```Status: 401 Unauthorized```
```{
    "name": "NotAuthenticated",
    "message": "Both API key and session cookie missing"
}```