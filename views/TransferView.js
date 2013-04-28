var View = require('./View')
, Models = require('../models')
, Backbone = require('backbone')
, num = require('num')
, Section = require('./SectionView')
, _ = require('underscore')
, TransferView = module.exports = Section.extend({
    initialize: function(options) {
        this.vm = new Backbone.Model({
            amount: '0.0',
            email: null,
            currencyId: 'null',
            currencies: options.app.cache.currencies.pluck('currency_id')
        })
    },

    section: 'accounts',

    events: {
        'click *[data-action="send"]': 'clickSend'
    },

    read: function() {
        this.vm.set({
            amount: this.$amount.val(),
            email: this.$email.val(),
            currencyId: this.$currency.val()
        })
    },

    clickSend: function(e) {
        var that = this

        e.preventDefault()

        this.read()

        var currency = this.options.app.cache.currencies.get(this.vm.get('currencyId'))
        , scale = currency.get('scale')
        , transaction = new Models.Transaction({
            email: this.vm.get('email'),
            currency_id: this.vm.get('currencyId'),
            amount: this.vm.get('amount')
        })

        var result = transaction.save({}, {
            url: app.apiUrl + '/transfer',
            username: 'api',
            password: app.apiKey
        })

        if (!result) {
            return alert(this.model.validationError)
        }

        this.toggleInteraction(false)

        result.then(function() {
            Alertify.log.success('Transfer sent to ' + transaction.get('email'))
            Backbone.history.navigate('my/transactions', true)
        }, function(xhr) {
            var error = app.errorFromXhr(xhr)
            alert(JSON.stringify(error, null, 4))
            that.toggleInteraction(true)
        })
    },

    toggleInteraction: function(value) {
        this.$email
        .add(this.$currency)
        .add(this.$amount)
        .add(this.$send)
        .prop('disabled', !value)
        .toggleClass('disabled', !value)
    },

    render: function() {
        this.$el.html(require('../templates/send.ejs')(this.vm.toJSON()))

        this.$email = this.$el.find('*[data-binding="email"]')
        this.$currency = this.$el.find('*[data-binding="currency"]')
        this.$amount = this.$el.find('*[data-binding="amount"]')
        this.$send = this.$el.find('*[data-action="send"]')

        return this
    }
})
