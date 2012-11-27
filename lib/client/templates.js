var ejs = require('ejs')
, cache = {}
, templates = module.exports = function(n) {
    return cache[n] || (cache[n] = ejs.compile(require('../../../assets/templates/' + n + '.ejs')))
}