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

        var that = this

        var security = Models.Security.findOrCreate(this.options.securityId)
        if (!security) throw new Error('security ' + this.options.securityId + ' not found')

        var withdraw = new Backbone.Model({
            address: this.$address.val(),
            amount: Math.floor(num(this.$amount.val()).mul(Math.pow(10, security.get('scale')))),
            securityId: this.options.securityId
        })

        this.$address.add(this.$amount, this.$withdraw).prop('disabled', true).addClass('disabled')

        var result = withdraw.save({}, {
            url: app.apiUrl + '/ripple/out',
            headers: app.apiHeaders(withdraw.toJSON())
        })

        if (!result) {
            return alert(this.model.validationError)
        }

        this.toggleInteraction(false)

        result.then(function() {
            Alertify.log.success('Ripple withdraw of ' + that.$amount.val() + ' ' +
                withdraw.get('securityId') + ' to ' + withdraw.get('address') + ' requested')
            Backbone.history.navigate('my/accounts', true)
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
            securityId: this.options.securityId
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
