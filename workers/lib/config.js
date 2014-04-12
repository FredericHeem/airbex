/*global require*/
module.exports = function () {
    var konphyg = require('konphyg')(__dirname + '/../config');
    var configAll = konphyg.all();
    var config = configAll.config;
    return config;
};