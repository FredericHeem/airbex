var View = require('./View')
, Models = require('../models')
, app = require('../app')
, Backbone = require('backbone')
, Section = require('./SectionView')
, _ = require('underscore')
, RippleOutView = module.exports = Section.extend({
    initialize: function() {
    },

    section: 'balances',

    events: {
        'click *[data-action="withdraw"]': 'clickWithdraw'
    },

    clickWithdraw: function(e) {
        e.preventDefault()

        var that = this

        var currency = Models.Currency.findOrCreate(this.options.currencyId)
        if (!currency) throw new Error('currency ' + this.options.currencyId + ' not found')

        var withdraw = new Backbone.Model({
            address: this.$address.val(),
            amount: this.$amount.val(),
            currencyId: this.options.currencyId
        })

        this.$address.add(this.$amount, this.$withdraw).prop('disabled', true).addClass('disabled')

        var result = withdraw.save({}, {
            url: app.apiUrl + '/ripple/out',
            username: 'api',
            password: app.apiKey
        })

        if (!result) {
            return alert(this.model.validationError)
        }

        this.toggleInteraction(false)

        result.then(function() {
            Alertify.log.success('Ripple withdraw of ' + that.$amount.val() + ' ' +
                withdraw.get('currencyId') + ' to ' + withdraw.get('address') + ' requested')
            Backbone.history.navigate('my/balances', true)
        }, function(xhr) {
            var error = app.errorFromXhr(xhr)
            alert(JSON.stringify(error, null, 4))
            that.toggleInteraction(true)
        })
    },

    toggleInteraction: function(value) {
        this.$el.find('input, button')
        .prop('disabled', !value)
        .toggleClass('disabled', !value)
    },

    render: function() {
        this.$el.html(require('../templates/ripple-out.ejs')({
            currencyId: this.options.currencyId
        }))

        this.$address = this.$el.find('input[data-binding="address"]')
        this.$amount = this.$el.find('input[data-binding="amount"]')
        this.$withdraw = this.$el.find('*[data-action="withdraw"]')

        var that = this

        setTimeout(function() {
            that.$address.focus()
        }, 0)

        return this
    }
})
