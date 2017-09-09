---
category: Authenticated
path: '/v1/order/:id'
title: 'Delete an order'
type: 'DELETE'

layout: nil
---

This method deletes an order on the given market.

### Request

* **`id:`** The order id to delete.

### Response

The HTTP response code is `204` for successful deletion.

* **`id:`** The order id to delete

```Status: 204 No Content```


For errors responses, see the [response status codes documentation](#response-status-codes).