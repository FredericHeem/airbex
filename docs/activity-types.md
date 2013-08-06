Activity types
===

### AdminBankAccountCredit

Triggers: API
Fields: amount, currency_id, user_id, reference

### AdminEditUser

Triggers: API
Fields: user_id, edits

### AdminWithdrawCancel

Triggers: API
Fields: id, error

### AdminWithdrawProcess

Trigger: API
Fields: id, error

### AdminWithdrawComplete

Triggers: API
Fields: id

### AddBankAccount

Triggers: API
Fields: id, accountNumber, iban, swiftbic, routingNumber

### RequestEmailVerification

Triggers: API

### ChangePassword

Triggers: API

### RemoveApiKey

Triggers: API

### CreateApiKey

Triggers: API
Fields: canTrade, canDeposit, canWithdraw

### CreateOrder

Triggers: API
Fields: market, type, price, amount, aon

### CancelOrder

Triggers: API
Fields: id

### SendToUser (email)

Triggers: API
Fields: to, amount, currency, code
Note: to can be id or email

### SendToUser (transfer)

Triggers: API
Fields: to, amount, currency

### ReceiveFromUser

Triggers: API
Fields: from, amount, currency

### ConvertBid

Triggers: API
Fields: market, amount

### UpdateUser

Triggers: API
Fields: updates

### Created

Triggers: API

### IdentitySet

Triggers: API

### CreateVoucher

Triggers: API
Fields: currency, amount, code

### Withdraw (bank)

Triggers: API
Fields: method, currency, amount

### Withdraw (Bitcoin)

Triggers: API
Fields: method, amount, address, currency

### Withdraw (Ripple)

Triggers: API
Fields: address, amount, currency, method

### WithdrawComplete

Triggers: Trigger
Fields: amount, currency, method
