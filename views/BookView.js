var SectionView = require('./SectionView')
, _ = require('underscore')
, numeral = require('numeral')
, num = require('num')
, View = require('./View')
, Models = require('../models')
, CreateOrderView = require('./CreateOrderView')
, BookView = module.exports = SectionView.extend({
    ItemView: View.extend({
        tagName: 'tr',

        render: function() {
            var vm = this.model.toJSON()
            , book = this.model.get('book')
            , scaleNumbers = ''
            for (var i = 0; i < book.get('scale'); i++) scaleNumbers += '0'
            vm.price = numeral(vm.price).format('0,0[.' + scaleNumbers + ']')

            this.$el.html(require('../templates/book-depth.ejs')(vm))
            return this;
        }
    }),

    className: 'container book',

    section: 'books',

    events: {
        'click .btn.create-order': 'showCreateOrder'
    },

    initialize: function() {
        this.views = [];

        this.model.get('depth').comparator = function(model) { return model.get('price') };
        this.model.get('depth').sort();

        this.bindTo(this.model.get('depth'), 'all', this.reset, this)
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
        var vm = {
            pair: this.model.pair()
        }

        this.$el.html(require('../templates/book.ejs')(vm))

        this.$children = this.$el.find('table.books tbody')
        this.reset()

        var view = new CreateOrderView({
            book: this.model
        })

        view.render().$el.appendTo(this.$el.find('.place-order-container'))

        return this
    },

    dispose: function() {
        this.views && _.invoke(this.views, 'dispose')
        View.prototype.dispose.call(this)
    }
})
