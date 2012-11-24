var View = require('./View')
, Models = require('../models')
, app = require('../app')
, templates = require('../templates')
, Backbone = require('backbone')
, num = require('num')
, Section = require('./SectionView')
, _ = require('underscore')
, SendView = module.exports = Section.extend({
    initialize: function() {
        this.vm = new Backbone.Model({
            amount: 0.0,
            credit: null,
            debit: null,
            accounts: app.session.get('user').get('accounts').map(function(a) {
                return {
                    id: a.id,
                    security: a.get('security').id,
                    available: a.availableDecimal()
                }
            })
        })
    },

    section: 'accounts',

    events: {
        'click *[data-action="send"]': 'clickSend'
    },

    read: function() {
        this.vm.set({
            amount: +this.$amount.val(),
            debit: +this.$debit.val(),
            credit: +this.$credit.val()
        })
    },

    clickSend: function(e) {
        e.preventDefault()

        this.read()

        this.$debit.add(this.$credit).add(this.$amount).add(this.$send).prop('disabled', true).addClass('disabled')

        var debit = Models.Account.findOrCreate(this.vm.get('debit'))

        var transaction = new Models.Transaction()
        transaction.save({
            debit_account_id: this.vm.get('debit'),
            credit_account_id: this.vm.get('credit'),
            amount: +num(this.vm.get('amount')).mul(Math.pow(10, debit.get('security').get('scale')))
        }, {
            success: function() {
                Backbone.history.navigate('my/accounts', true)
            }
        })
    },

    render: function() {
        this.$el.html(templates['send'](this.vm.toJSON()))

        this.$debit = this.$el.find('select[data-binding="debit"]')
        this.$credit = this.$el.find('input[data-binding="credit"]')
        this.$amount = this.$el.find('input[data-binding="amount"]')
        this.$send = this.$el.find('*[data-action="send"]')

        return this
    }
})