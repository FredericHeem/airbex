---
path: '/login'
title: 'Authenticate'

layout: nil
---

Authentication for third party program is done through API keys that can be created on the website under **``Account/API Key``**.
The HTTP request should contain the key as query parameter:

`https://demo.airbex.net/api/v1/balances?key=longkeyinhex`

Do not share with key with anyone, in case of doubt, delete the key and recreate one. 

### Response


For errors responses, see the [response status codes documentation](#response-status-codes).