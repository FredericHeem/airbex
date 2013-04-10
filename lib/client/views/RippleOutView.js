var View = require('./View')
, Models = require('../models')
, app = require('../app')
, Backbone = require('backbone')
, num = require('num')
, Section = require('./SectionView')
, _ = require('underscore')
, RippleOutView = module.exports = Section.extend({
    initialize: function() {
    },

    section: 'accounts',

    events: {
        'click *[data-action="withdraw"]': 'clickWithdraw'
    },

    clickWithdraw: function(e) {
        e.preventDefault()

        var security = Models.Security.findOrCreate(this.options.securityId)
        if (!security) throw new Error('security ' + this.options.securityId + ' not found')

        var withdraw = new Backbone.Model({
            address: this.$address.val(),
            amount: Math.floor(num(this.$amount.val()).mul(Math.pow(10, security.get('scale')))),
            securityId: this.options.securityId
        })

        this.$address.add(this.$amount, this.$withdraw).prop('disabled', true).addClass('disabled')

        withdraw.save({}, {
            url: app.api.url + '/private/rippleout',
            headers: app.api.headers(withdraw.toJSON()),
            success: function() {
                Backbone.history.navigate('my/accounts', true)
            }
        })
    },

    render: function() {
        this.$el.html(require('../../../assets/templates/ripple-out.ejs')({
            securityId: this.options.securityId
        }))

        this.$address = this.$el.find('input[data-binding="address"]')
        this.$amount = this.$el.find('input[data-binding="amount"]')
        this.$withdraw = this.$el.find('*[data-action="withdraw"]')
        return this
    }
})
