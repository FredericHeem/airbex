var SectionView = require('./SectionView')
, _ = require('underscore')
, numeral = require('numeral')
, num = require('num')
, View = require('./View')
, CreateOrderView = require('./CreateOrderView')
, MarketView = module.exports = SectionView.extend({
    ItemView: View.extend({
        tagName: 'tr',

        render: function() {
            var vm = this.model.toJSON()
            this.$el.html(require('../templates/market-depth.ejs')(vm))
            return this;
        }
    }),

    className: 'container market',

    section: 'markets',

    events: {
        'click .btn.create-order': 'showCreateOrder'
    },

    initialize: function() {
        this.views = [];

        this.collection.comparator = function(model) {
            return model.get('price')
        }

        this.bindTo(this.collection, 'all', this.reset, this)
    },

    add: function(model) {
        var view = new this.ItemView({ model: model })
        this.views.push(view)
        this.$children.append(view.render().$el)
    },

    reset: function() {
        _.invoke(this.views, 'dispose')
        this.views = []
        this.collection.each(this.add, this)
    },

    render: function() {
        var vm = {
            id: this.model.id
        }

        this.$el.html(require('../templates/market.ejs')(vm))

        this.$children = this.$el.find('table.markets tbody')
        this.reset()

        var view = new CreateOrderView({
            market: this.model
        })

        view.render().$el.appendTo(this.$el.find('.place-order-container'))

        return this
    },

    dispose: function() {
        this.views && _.invoke(this.views, 'dispose')
        View.prototype.dispose.call(this)
    }
})
