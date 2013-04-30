var View = require('./View')
, app = require('../app')
, Backbone = require('backbone')
, num = require('num')
, Section = require('./SectionView')
, _ = require('underscore')
, DepositBTCView = module.exports = Section.extend({
    initialize: function() {
        this.bindTo(this.model, 'change', this.render, this)
    },

    section: 'balances',

    render: function() {
        this.$el.html(require('../templates/deposit-btc.ejs')(this.model.toJSON()))
        return this
    }
})
