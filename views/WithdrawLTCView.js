var View = require('./View')
, Models = require('../models')
, app = require('../app')
, Backbone = require('backbone')
, Section = require('./SectionView')
, _ = require('underscore')
, WithdrawLTCView = module.exports = Section.extend({
    initialize: function() {
        _.bindAll(this);
    },

    section: 'accounts',

    events: {
        'click *[data-action="withdraw"]': 'clickWithdraw'
    },

    clickWithdraw: function(e) {
        e.preventDefault()

        var withdraw = new Backbone.Model({
            address: this.$address.val(),
            amount: this.$amount.val()
        });

        this.$address.add(this.$amount, this.$withdraw).prop('disabled', true).addClass('disabled')

        withdraw.save({}, {
            url: app.apiUrl + '/withdraw/LTC',
            username: 'api',
            password: app.apiKey,
            success: function() {
                Backbone.history.navigate('my/accounts', true)
            }
        })
    },

    render: function() {
        this.$el.html(require('../templates/withdraw-ltc.ejs')())
        this.$address = this.$el.find('input[data-binding="address"]')
        this.$amount = this.$el.find('input[data-binding="amount"]')
        this.$withdraw = this.$el.find('*[data-action="withdraw"]')
        return this
    }
})
