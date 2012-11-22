var Backbone = require('backbone')
, View = module.exports = Backbone.View.extend({
    show: function(render) {
        $(window).scrollTop(0).scrollLeft(0);
        this.$el.addClass('active').siblings().removeClass('active');

        if (render) this.render();
    },

    bindTo: function(target, name, callback, context) {
        this.bindings || (this.bindings = []);
        this.bindings.push({ target: target, name: name, callback: callback })
        target.bind(name, callback, context);
    },

    dispose: function() {
        console.log('disposing of view', this);

        // this will unbind all events that this view has bound to
        _.each(this.bindings, function(b) {
            b.target.unbind(b.name, b.callback);
        });

        this.bindings = null;

        // this will unbind all listeners to events from this view. This is probably not necessary because this view will be garbage collected.
        this.unbind();

        $(this.el).removeData().unbind();

        this.undelegateEvents();

        // uses the default Backbone.View.remove() method which removes this.el from the DOM and removes DOM events.
        Backbone.View.prototype.remove.call(this, arguments);
    }
});