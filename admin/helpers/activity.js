/* jshint maxcomplexity: 99 */
var format = require('util').format
, num = require('num')

function formatFillOrder(details) {
    var amount = details.original
    , base = details.market.substr(0, 3)
    , quote = details.market.substr(3)
    , amountFormatted = numbers.format(amount, { currency: base })
    , price = details.price
    , type = details.type || details.side

    var totalFormatted = details.total ?
        numbers.format(details.total, { currency: quote }) :
        '?'

    if (price) {
        var priceFormatted = numbers.format(price, { currency: quote })

        if (type == 'bid') {
            return format('Bought %s for %s (%s per)', amountFormatted,
                totalFormatted, priceFormatted)
        }

        return format('Sold %s for %s (%s per)', amountFormatted,
            totalFormatted, priceFormatted)
    }

    if (type == 'bid') {
        return format('Bought %s for %s', amountFormatted, totalFormatted)
    }

    return format('Sold %s for %s (%s per)', amountFormatted, totalFormatted)
}

function formatCreateOrder(details) {
    var amount = details.volume || details.amount
    , quote = details.market.substr(3, 3)
    , base = details.market.substr(0, 3)
    , amountFormatted = numbers.format(amount, { currency: base })
    , price = details.price
    , type = details.type || details.side

    if (price) {
        var total = num(price).mul(amount).toString()
        , totalFormatted = numbers.format(total, { currency: quote })
        , priceFormatted = numbers.format(price, { currency: quote })

        if (type == 'bid') {
            return format('You created an order to buy %s for %s (%s per)',
                amountFormatted, totalFormatted, priceFormatted)
        }

        return format('You created an order to sell %s for %s (%s per)', amountFormatted,
            totalFormatted, priceFormatted)
    } else {
        if (type == 'bid') {
            return format('You created an order to buy %s for %s at market price',
                amountFormatted, quote)
        }

        return format('You created an order to sell %s for %s at market price',
            amountFormatted, quote)
    }
}

function formatAdminBankAccountCredit(details) {
    return format('Admin: Credited user %s\'s bank account (#%s) with %s %s (%s)',
        details.user_id,
        details.bank_account_id,
        numbers.format(details.amount),
        details.currency_id,
        details.reference)
}

module.exports = function(activity) {
    var details = activity.details

    if (activity.type == 'CreateOrder') {
        return formatCreateOrder(details)
    }

    if (activity.type == 'FillOrder') {
        return formatFillOrder(details)
    }

    if (activity.type == 'WithdrawComplete') {
        return format('Withdraw request of %s completed',
            numbers.format(details.amount, { currency: details.currency }))
    }

    if (activity.type == 'Credit') {
        return format('Credited %s from a deposit',
            numbers.format(details.amount, { currency: details.currency }))
    }

    if (activity.type == 'CreateVoucher') {
        return format('You created a voucher for %s', numbers.format(details.amount,
            { currency: details.currency }))
    }

    if (activity.type == 'CancelOrder') {
        return format('You cancelled order #%s', activity.details.id)
    }

    if (activity.type == 'ChangePassword') {
        return format('You changed your password')
    }

    if (activity.type == 'BankCredit') {
        return format('You deposited %s %s from a bank account (%s)',
            numbers.format(activity.details.amount),
            activity.details.currency,
            activity.details.reference)
    }

    if (activity.type == 'RippleWithdraw') {
        return format('You requested to withdraw %s %s to Ripple (%s)',
            activity.details.amount, activity.details.currency, activity.details.address)
    }

    if (activity.type == 'LTCWithdraw') {
        return format('You requested to withdraw %s LTC to %s',
            numbers.format(activity.details.amount), activity.details.address)
    }

    if (activity.type == 'BTCWithdraw') {
        return format('You requested to withdraw %s BTC to %s',
            numbers.format(activity.details.amount), activity.details.address)
    }

    if (activity.type == 'SendToUser') {
        return format('You sent %s %s to %s',
            numbers.format(activity.details.amount),
            activity.details.currency,
            activity.details.to)
    }

    if (activity.type == 'Created') {
        return format('You created this user account')
    }

    if (activity.type == 'IdentitySet') {
        return format('You supplied your name and address')
    }

    if (activity.type == 'AdminBankAccountCredit') {
        return formatAdminBankAccountCredit(details)
    }

    if (activity.type == 'AdminWithdrawCancel') {
        return format('Admin: Cancelled withdraw request #%s (%s)',
            activity.details.id, activity.details.error)
    }

    if (activity.type == 'AdminWithdrawComplete') {
        return format('Admin: Completed withdraw request #%s', activity.details.id)
    }

    if (activity.type == 'AdminWithdrawProcess') {
        return format('Admin: Started processing withdraw request #%s',
            activity.details.id)
    }

    if (activity.type == 'KycCompleted') {
        return 'Passed KYC'
    }

    return JSON.stringify(activity)
}
