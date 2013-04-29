var SectionView = require('./SectionView')
, _ = require('underscore')
, View = require('./View')
, moment = require('moment')
, ActivitiesView = module.exports = SectionView.extend({
    ItemView: View.extend({
        tagName: 'tr',

        explanation: function() {
            return this.model.get('type') + ' ' + JSON.stringify(this.model.get('details'))
        },

        render: function() {
            var vm = this.model.toJSON()
            vm.created = moment(vm.created).format('MMMM Do YYYY, HH:mm')
            vm.explanation = this.explanation()
            this.$el.html(require('../templates/activities-item.ejs')(vm))
            return this
        }
    }),

    section: 'activities',

    className: 'activities container',

    initialize: function() {
        this.views = [];
        this.bindTo(this.collection, 'add', this.add, this);
        this.bindTo(this.collection, 'reset', this.render, this);
        this.bindTo(this.collection, 'remove', this.remove, this);
    },

    add: function(model) {
        var view = new this.ItemView({ model: model });
        this.views.push(view)
        this.$children.append(view.render().$el)
    },

    reset: function() {
        this.views && _.invoke(this.views, 'dispose')
        this.views = []
        this.collection.each(this.add, this);
    },

    render: function() {
        this.$el.html(require('../templates/activities.ejs')());
        this.$children = this.$el.find('table.activities tbody')
        this.reset()
        return this
    },

    dispose: function() {
        _.invoke(this.views, 'dispose')
        View.prototype.dispose.call(this)
    }
})
