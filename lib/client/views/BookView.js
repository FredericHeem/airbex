var SectionView = require('./SectionView')
, _ = require('underscore')
, View = require('./View')
, Models = require('../models')
, BookView = module.exports = SectionView.extend({
    ItemView: View.extend({
        tagName: 'tr',

        render: function() {
            var vm = this.model.toJSON();
            this.$el.html(require('../../../assets/templates/book-depth.ejs')(vm))
            return this;
        }
    }),

    section: 'books',

    initialize: function() {
        this.views = [];

        this.model.get('depth').comparator = function(model) { return model.get('price') };
        this.model.get('depth').sort();

        this.bindTo(this.model.get('depth'), 'reset', this.reset, this)
        this.bindTo(this.model.get('depth'), 'add', this.add, this)
    },

    add: function(model) {
        var view = new this.ItemView({ model: model })
        this.views.push(view)
        this.$children.append(view.render().$el)
    },

    reset: function() {
        _.invoke(this.views, 'dispose')
        this.views = []
        this.model.get('depth').each(this.add, this)
    },

    render: function() {
        this.$el.html(require('../../../assets/templates/book.ejs')())

        this.$children = this.$el.find('table.books tbody')
        this.reset()

        this.$el.find('.create-order').attr('href', window.location.hash + '/new')

        return this
    },

    dispose: function() {
        this.views && _.invoke(this.views, 'dispose')
        View.prototype.dispose.call(this)
    }
});