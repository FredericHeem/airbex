var View = require('./View')
, Backbone = require('backbone')
, num = require('num')
, Section = require('./SectionView')
, _ = require('underscore')
, TransferView = module.exports = Section.extend({
    initialize: function(options) {
        this.vm = new Backbone.Model({
            amount: '0.0',
            email: null,
            currency: this.options.currency,
            currencies: this.options.app.cache.currencies.map(function(x) {
                return x.id
            })
        })
    },

    section: 'balances',

    events: {
        'click *[data-action="send"]': 'clickSend'
    },

    read: function() {
        this.vm.set({
            amount: this.$amount.val(),
            email: this.$email.val(),
            currency: this.$currency.val()
        })
    },

    clickSend: function(e) {
        var that = this

        e.preventDefault()

        this.read()

        var model = new Backbone.Model({
            email: this.vm.get('email'),
            currency: this.vm.get('currency'),
            amount: this.vm.get('amount')
        })

        var result = model.save({}, {
            url: this.options.app.apiUrl + '/transfer',
            username: 'api',
            password: this.options.app.apiKey
        })

        if (!result) {
            return alert(this.model.validationError)
        }

        this.toggleInteraction(false)

        result.then(function() {
            Alertify.log.success('Transfer sent to ' + model.get('email'))
            Backbone.history.navigate('my/activities', true)
        }, function(xhr) {
            var error = that.options.app.errorFromXhr(xhr)
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
