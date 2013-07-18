var crypto = require('crypto')

exports.number = function(min, max) {
    min = min || 1
    max = max || 100

    return Math.round(Math.random() * (max - min)) + min
}

exports.fromAlphabet = function(alphabet, length) {
    var result = ''
    for (var i = 0; i < length; i++) {
        result += alphabet[exports.number(0, alphabet.length - 1)]
    }
    return result
}

exports.bitcoinAddress = function() {
    var len = exports.number(27, 34)
    , prefix = '1'
    , alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
    , hash = exports.fromAlphabet(alphabet, len - 1)
    return prefix + hash
}

exports.litecoinAddress = function() {
    var len = exports.number(27, 34)
    , prefix = 'L'
    , alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
    , hash = exports.fromAlphabet(alphabet, len - 1)
    return prefix + hash
}
