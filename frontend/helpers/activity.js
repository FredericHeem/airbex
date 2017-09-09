/* jshint maxcomplexity: 99 */
var format = require('util').format
, num = require('num')

function getAmountWithFee(amount, scale, fee_ratio){
    var amountWithFee = num(amount).set_precision(scale);
    return amountWithFee.mul(num("1").add(fee_ratio)).round(scale - 1).set_precision(scale);
}

function getBidAmountWithFee(amount, scale, fee_ratio){
    var amountWithFee = num(amount).set_precision(scale + 4);
    return amountWithFee.mul(num("1").add(fee_ratio)).round(scale).toString();
}

function getAskAmountWithFee(amount, scale, fee_ratio){
    var amountWithFee = num(amount).set_precision(scale + 4);
    return amountWithFee.mul(num("1").sub(fee_ratio)).round(scale).toString();
}

function formatFillOrder(details) {
    var amount = details.original
    var price = details.price
    var type = details.type || details.side
    var base = api.getBaseCurrency(details.market)
    var baseScale = api.currencies[base].scale
    var quote = api.getQuoteCurrency(details.market)
    var quoteScale = api.currencies[quote].scale
    var quoteDisplay = api.currencies[quote].scale_display;
    var fee_ratio = details.fee_ratio ? details.fee_ratio : 0.005;
    var fee_pc = fee_ratio * 100;
    
    if (price) {
        var priceFormatted = numbers.formatCurrency(price, quote)
        if (type == 'bid') {
            var amountFormatted = numbers.formatCurrency(amount, base)

            var total = num(price).mul(amount).toString()
            var totalFormatted = numbers.formatCurrency(total, quote)

            return i18n('activities.FillOrder.limit.bid', amountFormatted,
                    totalFormatted, priceFormatted, fee_pc)
        } else {
            var amountFormatted = numbers.formatCurrency(amount, base)

            var total = num(price).mul(amount).toString()
            var totalFormatted = numbers.formatCurrency(total, quote)

            return i18n('activities.FillOrder.limit.ask', amountFormatted,
                    totalFormatted, priceFormatted, fee_pc)
        }
    } else {
        
        if (type == 'bid') {
            var totalWithFee = getBidAmountWithFee(details.total, quoteDisplay, fee_ratio);
            var amountFormatted = numbers.formatCurrency(amount, base);
            return i18n('activities.FillOrder.market.bid', amountFormatted, totalWithFee, quote, fee_pc)
        } else {
            var totalWithFee = getAskAmountWithFee(details.total, quoteDisplay, fee_ratio);
            var amountFormatted = numbers.formatCurrency(amount, base)
            return i18n('activities.FillOrder.market.ask', amountFormatted, totalWithFee, quote, fee_pc)
        }
    }
}

function formatPurchaseOrderCrete(details) {
    var amount = details.amount
    , quote = api.getQuoteCurrency(details.market)
    , base = api.getBaseCurrency(details.market)
    , amountFormatted = numbers.formatCurrency(amount, quote)
    , type = details.type

    return i18n('activities.PurchaseCreateOrder.create', base, amountFormatted)
}


function formatCreateOrder(details) {
    var amount = details.volume || details.amount
    , base = api.getBaseCurrency(details.market)
    , quote = api.getQuoteCurrency(details.market)
    , amountFormatted = numbers.formatCurrency(amount, base)
    , price = details.price
    , type = details.type || details.side;

    var baseScale = api.currencies[base].scale
    var quoteScale = api.currencies[quote].scale
    
    var fee_ratio = details.fee_ratio ? details.fee_ratio : 0.005;

    if (price) {
        var priceFormatted = numbers.formatCurrency(price, quote)

        if (type == 'bid') {
            var total = num(price).mul(amount).toString()
            var totalFormatted = numbers.formatCurrency(total, quote)
            return i18n('activities.CreateOrder.limit.bid', amountFormatted,
                    totalFormatted, priceFormatted)
        } else {
            var amountFormatted = numbers.formatCurrency(details.amount, base)
            var total = num(price).mul(details.amount).toString()
            var totalFormatted = numbers.formatCurrency(total, quote)

            return i18n('activities.CreateOrder.limit.ask', amountFormatted,
                    totalFormatted, priceFormatted)
        }
    } else {
        if (type == 'bid') {
            var amountFormatted = numbers.formatCurrency(amount, base)
            return i18n('activities.CreateOrder.market.bid', amountFormatted, quote)
        } else {
            var amountFormatted = numbers.formatCurrency(amount, base)
            return i18n('activities.CreateOrder.market.ask', amountFormatted, quote)
        }
    }
}

module.exports = function(activity) {
    var details = activity.details

    if (activity.type == 'CreateOrder') {
        return formatCreateOrder(details)
    }
    
    if (activity.type == 'PurchaseOrderCreate') {
        return formatPurchaseOrderCrete(details)
    }
    
    if (activity.type == 'FillOrder') {
        return formatFillOrder(details)
    }

    if (activity.type == 'WithdrawComplete') {
        return i18n('activities.WithdrawComplete',
            numbers.formatCurrency(details.amount, details.currency))
    }
    
    if (activity.type == 'WithdrawRequest') {
        return i18n('activities.WithdrawRequest',
            numbers.formatCurrency(details.amount, details.currency))
    }
    
    if (activity.type == 'CancelWithdrawRequest') {
        return i18n('activities.CancelWithdrawRequest')
    }
    if (activity.type == 'VerifyBankAccount') {
        return i18n('activities.VerifyBankAccount',
            details.accountNumber || details.iban)
    }

    if (activity.type == 'Credit') {
        return i18n('activities.Credit',
            numbers.formatCurrency(details.amount, details.currency))
    }

    if (activity.type == 'CreateVoucher') {
        return i18n('activities.CreateVoucher', numbers.formatCurrency(details.amount,
            details.currency))
    }

    if (activity.type == 'ReceiveFromUser') {
        return i18n('activities.ReceiveFromUser', numbers.formatCurrency(details.amount,
            details.currency), details.from)
    }
    
    if (activity.type == 'CancelOrder') {
        return format(i18n('activities.CancelOrder'), activity.details.id)
    }

    if (activity.type == 'ChangePassword') {
        return format(i18n('activities.ChangePassword'))
    }

    if (activity.type == 'ApiKeyCreate') {
        return format(i18n('activities.ApiKeyCreate'))
    }
    
    if (activity.type == 'BankCredit') {
        return format(i18n('activities.BankCredit'),
            numbers.formatCurrency(activity.details.amount, details.currency),
            activity.details.reference)
    }

    if (activity.type == 'RippleWithdraw') {
        return format(i18n('activities.RippleWithdraw'),
            activity.details.amount, activity.details.currency, activity.details.address)
    }

    if (activity.type == 'CryptoWithdraw') {
        return format(i18n('activities.Withdraw'),
            numbers.format(details.amount, { currency: details.currency }), details.address)
    }

    if (activity.type == 'SendToUser') {
        return format(i18n('activities.SendToUser'),
            numbers.format(activity.details.amount),
            activity.details.currency,
            activity.details.to)
    }

    if (activity.type == 'Created') {
        return i18n('activities.Created')
    }

    if (activity.type == 'IdentitySet') {
        return i18n('activities.IdentitySet')
    }

    if (activity.type == 'EnableTwoFactor') {
        return i18n('activities.EnableTwoFactor')
    }

    if (activity.type == 'RemoveTwoFactor') {
        return i18n('activities.RemoveTwoFactor')
    }

    if (activity.type == 'KycCompleted') {
        return i18n('activities.KycCompleted')
    }

    if (activity.type == 'Login') {
        return format(i18n('activities.Login'),
                activity.details.ip, activity.details.ip)
    }
    
    //return JSON.stringify(activity)
}
