var Relational = require('backbone-relational')
, Currency = module.exports = Relational.RelationalModel.extend({
    idAttribute: 'currency_id'
});