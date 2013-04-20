var View = require('./View')
, Models = require('../models')
, Backbone = require('backbone')
, num = require('num')
, Section = require('./SectionView')
, _ = require('underscore')
, SendView = module.exports = Section.extend({
    initialize: function(options) {
        this.vm = new Backbone.Model({
            amount: 0.0,
            email: null,
            securityId: 'null',
            securities: options.app.cache.securities.pluck('security_id')
        })
    },

    section: 'accounts',

    events: {
        'click *[data-action="send"]': 'clickSend'
    },

    read: function() {
        this.vm.set({
            amount: +this.$amount.val(),
            email: this.$email.val(),
            securityId: this.$security.val()
        })
    },

    clickSend: function(e) {
        var that = this

        e.preventDefault()

        this.read()

        var security = this.options.app.cache.securities.get(this.vm.get('securityId'))
        , scale = security.get('scale')
        , transaction = new Models.Transaction({
            email: this.vm.get('email'),
            security_id: this.vm.get('securityId'),
            amount: +num(this.vm.get('amount')).mul(Math.pow(10, scale))
        })

        var result = transaction.save({}, {
            url: app.apiUrl + '/transfer',
            headers: app.apiHeaders(transaction.toJSON())
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
        .add(this.$security)
        .add(this.$amount)
        .add(this.$send)
        .prop('disabled', !value)
        .toggleClass('disabled', !value)
    },

    render: function() {
        this.$el.html(require('../templates/send.ejs')(this.vm.toJSON()))

        this.$email = this.$el.find('*[data-binding="email"]')
        this.$security = this.$el.find('*[data-binding="security"]')
        this.$amount = this.$el.find('*[data-binding="amount"]')
        this.$send = this.$el.find('*[data-action="send"]')

        return this
    }
})
