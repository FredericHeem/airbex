var template = require('./index.html')
, _ = require('lodash')
, nav = require('../nav')
, num = require('num')
, validation = require('../../../helpers/validation')
, debug = require('../../../helpers/debug')('snow:withdraw ripple')
, minFunded = '75'
, format = require('util').format
, uptodate = require('../../../helpers/uptodate')
, ripple = require('../../../helpers/ripple')

module.exports = function() {
    var $el = $('<div class="withdraw-ripple is-entering">').html($(template()))
    , ctrl = {
        $el: $el
    }
    , currencies = _.pluck(_.filter(api.currencies.value, function(x) {
        return !x.fiat
    }), 'id')
    , amount = require('../../shared/amount-input')({
        currency: 'XRP',
        currencies: currencies,
        max: 'available'
    })
    , $entryForm = $el.find('form.entry')
    , $entrySubmit = $entryForm.find('[type="submit"]')
    , $address = $entryForm.find('.address')
    , utd

    $el.find('.amount-placeholder').replaceWith(amount.$el)

    // Validation
    var validateDestination = function() {
        var val = $entryForm.field('address').val()
        return ripple.resolve(val)
    }

    var validateAmount = function() {
        if (amount.validate(true)) {
            return $.Deferred().resolve({
                amount: amount.value(),
                currency: amount.currency()
            })
        }

        debug('amount validation failed')

        return $.Deferred().reject()
    }

    validation.monitorField($entryForm.field('address'), validateDestination)
    validation.monitorField($entryForm.field('amount'), validateAmount)

    var validateFields = validation.fromFields({
        destination: validateDestination,
        amount: validateAmount
    })

    function validateAccountBalance(values, err, account) {
        if (err) {
            if (err.name == 'AccountNotFound') {
                debug('account was not found. can still withdraw if doing so would meet reserve')

                // The account was not found, but this withdraw will create it
                if (values.amount.currency == 'XRP' && num(values.amount.amount).gte(minFunded)) {
                    debug('would meet reserve')
                    return $.Deferred().resolve(values)
                }

                $address.addClass('has-error is-unfunded')
                return $.Deferred().reject()
            }

            throw err
        }

        debug('balance retrieved as %s XRP', account.balance)

        var balance = num(account.balance)
        balance.set_precision(6)

        if (values.amount.currency == 'XRP') {
            balance = balance.add(values.amount.amount)
            debug('%s XRP is being withdrawn. final balance is %s XRP', values.amount.amount, balance.toString())
        }

        if (balance.lt(minFunded)) {
            $address.addClass('has-error is-unfunded')
            return $.Deferred().reject()
        }

        debug('account has sufficient XRP')

        return values
    }

    function validateTrust(values) {
        debug('validating trust from %s (%s)', values.destination.address, values.amount.currency)
        return ripple.trustFrom(values.destination.address, values.amount.currency)
        .then(function(line) {
            debug('account has %s trust and %s in use', line.limit, line.balance)

            var lacking = num(0).set_precision(6)
            .add(line.limit)
            .sub(line.balance)
            .sub(values.amount.amount)
            .mul(-1)

            // Trust line is sufficient
            if (lacking.lte(0)) {
                return values
            }

            return $.Deferred().reject({
                lacking: lacking.toString(),
                line: line
            })
        })
    }

    var validate = function() {
        return validateFields()
        .then(function(values) {
            // Check for account existence (balance)
            return api.call('v1/ripple/account/' + values.destination.address)
            .then(function(account) {
                return validateAccountBalance(values, null, account)
            }, function(err) {
                return validateAccountBalance(values, err)
            })
        })
        .then(function(values) {
            // If XRP is being withdrawn, there is no need to check trust lines
            if (values.amount.currency == 'XRP') {
                return values
            }

            return validateTrust(values)
            .then(null, function(err) {
                $address.addClass('has-error has-too-low-trust')

                $address.find('.too-low-trust [data-id="amount-lacking"]')
                .text(numbers(err.lacking, { currency: values.amount.currency }))

                // Retrieve our ripple account
                return api.rippleAddress()
                .then(function(address) {
                    debug('resolved our address as %s', address)

                    // Trust link is absolute, not additive
                    var required = err.lacking.add(err.line.balance)

                    debug('asking user to add %s trust', required.toString())

                    $address.find('.too-low-trust a.add-trust')
                    .attr('href', format('https://ripple.com//trust?to=%s&amount=%s/%s&label=%s&name=Justcoin',
                        address, required.toString(), values.amount.currency,
                        encodeURIComponent(format('Hi %s!', api.user.firstName || 'there'))
                    ))

                    return $.Deferred().reject()
                })
            })
        })
    }

    function review(values) {
        var deferred = $.Deferred()
        , $review = $el.find('.review')

        $el.toggleClass('is-entering is-reviewing')

        if (values.destination.federation) {
            $review.find('.address').html(format('<abbr title="%s">%s</abbr>',
                values.destination.address,
                values.destination.federation))
        } else {
            $review.find('.address').text(values.destination.address)
        }

        $review.find('.amount').text(numbers(values.amount.amount, {
            currency: values.amount.currency
        }))

        $review.on('click', '[type="submit"]', function(e) {
            e.preventDefault()
            deferred.resolve(values)
        })

        $review.on('click', '.back', function(e) {
            e.preventDefault()
            deferred.reject('back')
        })

        return deferred
    }

    function send(values) {
        var $send = $el.find('.summary')
        , $status = $send.find('.status')

        $el.toggleClass('is-reviewing is-sending')
        $status.addClass('requested')

        $send.find('.address').text(values.destination.address)
        $send.find('.amount').text(numbers(values.amount.amount, {
            currency: values.amount.currency
        }))

        return api.call('v1/ripple/out', {
            currency: values.amount.currency,
            amount: values.amount.amount,
            address: values.destination.address
        })
        .then(function(withdraw) {
            var deferred = $.Deferred()

            utd = uptodate(function() {
                return api.call('v1/withdraws')
                .then(function(withdraws) {
                    return _.find(withdraws, { id: withdraw.id })
                })
            }, function(err, withdraw) {
                if (err) {
                    debug('refresh failed: %s', err.message)
                    return
                }

                if (!withdraw) return

                $status.removeClasses(/^is-/)
                .addClass('is-' + withdraw.state)

                if (withdraw.state == 'completed') {
                    utd.stop()
                    deferred.resolve()
                }

                if (withdraw.state == 'cancelled') {
                    utd.stop()
                    $status.find('.cancelled-reason').text(withdraw.error)
                    deferred.reject(withdraw.error)
                }
            })

            return deferred
        })
    }

    $el.on('submit', '.entry', function(e) {
        e.preventDefault()

        $entryForm.addClass('is-loading')
        $entrySubmit.loading(true)

        validate(true)
        .always(function() {
            $entryForm.removeClass('is-loading')
            $entrySubmit.loading(false)
        })
        .then(function(values) {
            return review(values)
            .then(send, function() {
                debug('review rejected')
                $el.toggleClass('is-entering is-reviewing')
            })
        })
    })

    // Dispose
    $el.on('remove', function() {
        amount.$el.triggerHandler('remove')
        utd && utd.stop()
    })

    // Insert navigation (top)
    $el.find('.withdraw-nav').replaceWith(nav('ripple').$el)

    // Focus first field (address)
    $el.find('.form-control:first').focusSoon()

    return ctrl
}
