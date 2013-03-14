var View = require('./View')
, Models = require('../models')
, app = require('../app')
, templates = require('../templates')
, Backbone = require('backbone')
, num = require('num')
, Section = require('./SectionView')
, _ = require('underscore')
, DepositBTCView = module.exports = Section.extend({
    initialize: function() {
        this.bindTo(this.model, 'change', this.render, this)
    },

    section: 'accounts',

    render: function() {
        this.$el.html(templates('deposit-btc')(this.model.toJSON()))
        return this
    }
})