var SectionView = require('./SectionView')
, _ = require('underscore')
, num = require('num')
, app = require('../app')
, View = require('./View')
, MarketsView = module.exports = SectionView.extend({
    ItemView: View.extend({
        tagName: 'tr',

        render: function() {
            var vm = this.model.toJSON()
            , template = require('../templates/markets-market.ejs')
            this.$el.html(template(vm));

            return this;
        }
    }),

    section: 'markets',

    initialize: function() {
        this.bindTo(this.collection, 'reset', this.reset, this);
        this.bindTo(this.collection, 'add', this.add, this);
    },

    add: function(model) {
        var view = new this.ItemView({ model: model });
        this.items.push(view);
        this.$el.find('table.markets tbody').append(view.render().$el);
    },

    reset: function() {
        _.invoke(this.items, 'dispose');
        this.items = []
        this.$el.find('table.markets tbody').empty()
        this.collection.each(this.add, this)
    },

    render: function() {
        this.$el.html(require('../templates/markets.ejs')());
        this.reset();

        return this;
    },

    dispose: function() {
        _.invoke(this.items, 'dispose');

        return View.prototype.dispose.apply(this, arguments);
    }
});