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
        e.preventDefault()

        this.read()

        this.$email.add(this.$security).add(this.$amount).add(this.$send).prop('disabled', true).addClass('disabled')

        var security = this.options.app.cache.securities.get(this.vm.get('securityId'))
        , scale = security.get('scale')
        , transaction = new Models.Transaction({
            email: this.vm.get('email'),
            security_id: this.vm.get('securityId'),
            amount: +num(this.vm.get('amount')).mul(Math.pow(10, scale))
        })

        transaction.save({}, {
            url: app.api.url + '/transfer',
            headers: app.api.headers(transaction.toJSON()),
            success: function() {
                Backbone.history.navigate('my/transactions', true)
            }
        })
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
