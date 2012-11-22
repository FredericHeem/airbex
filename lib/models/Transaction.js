var Relational = require('backbone-rel')
, Transaction = module.exports = Relational.RelationalModel.extend({
    idAttribute: 'transaction_id'
});