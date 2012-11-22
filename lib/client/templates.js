var ejs = require('ejs')
, templates = module.exports = {
    read: function() {
        $('script[type="text/template"]').each(function(k, t) {
            var $t = $(t);
            templates[$t.attr('id').replace(/-template/, '')] = ejs.compile($t.remove().html());
        });
    }
};