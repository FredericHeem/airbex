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
        _.bindAll(this);

        this.viewModel = new Backbone.Model({
            address: null
        })

        this.viewModel.fetch({
            url: '/api/private/deposit/BTC/address'
        })

        this.bindTo(this.viewModel, 'change', this.render, this)
    },

    section: 'accounts',

    render: function() {
        this.$el.html(templates('deposit-btc')(this.viewModel.toJSON()))
        return this
    }
})