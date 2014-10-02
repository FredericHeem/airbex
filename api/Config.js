/*global require*/
module.exports = function () {
    console.log("config dir ", __dirname)
    var konphyg = require('konphyg')(__dirname + '/config');
    var configAll = konphyg.all();
    var config = configAll.config;
    return config;
};