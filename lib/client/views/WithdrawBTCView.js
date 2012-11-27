var View = require('./View')
, Models = require('../models')
, app = require('../app')
, templates = require('../templates')
, Backbone = require('backbone')
, num = require('num')
, Section = require('./SectionView')
, _ = require('underscore')
, WithdrawBTCView = module.exports = Section.extend({
    initialize: function() {
        _.bindAll(this);
    },

    section: 'accounts',

    events: {
        'click *[data-action="withdraw"]': 'clickWithdraw'
    },

    clickWithdraw: function(e) {
        e.preventDefault()

        // todo: hard coded scale

        var withdraw = new Backbone.Model({
            address: this.$address.val(),
            amount: Math.floor(num(this.$amount.val()).mul(1e8))
        });

        this.$address.add(this.$amount, this.$withdraw).prop('disabled', true).addClass('disabled')

        withdraw.save({}, {
            url: '/api/private/withdraw/BTC',
            success: function() {
                Backbone.history.navigate('my/accounts', true)
            }
        })
    },

    render: function() {
        this.$el.html(templates('withdraw-btc')())
        this.$address = this.$el.find('input[data-binding="address"]')
        this.$amount = this.$el.find('input[data-binding="amount"]')
        this.$withdraw = this.$el.find('*[data-action="withdraw"]')
        return this
    }
})