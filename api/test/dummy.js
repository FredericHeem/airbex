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

exports.id = exports.number.bind(exports, 1, 1e6)

exports.phoneCode = function() {
    return exports.fromAlphabet('1234567890', 4)
}

exports.bool = exports['boolean'] = function() {
    return Math.random() < 0.5
}

exports.hex = function(length) {
    var hex = crypto.randomBytes(Math.ceil(length / 2)).toString('hex')
    return hex.substr(0, length)
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

exports.rippleAddress = function() {
    var len = exports.number(27, 34)
    , prefix = 'r'
    , alphabet = 'rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz'
    , hash = exports.fromAlphabet(alphabet, len - 1)
    return prefix + hash
}

var rand = function(arr, count) {
    var offset = Math.floor(Math.random() * (arr.length - (count || 1) - 1))

    return count > 1 ? arr.slice(offset, offset + count) : arr[offset]
}

var firstNames = [
    'Skrue',
    'Bestemor',
    'Donald',
    'Ole',
    'Dole',
    'Doffen',
    'Dolly',
    'Hetti',
    'Netti',
    'Letti',
    'Mikke',
    'Minni',
    'Langbein',
    'Guffen',
    'Anton',
    'Politimester',
    'Petter',
    'Svarte-Petter',
    'Ordfører',
    'Klara',
    'Klaus',
    'Klodrik',
    'Pluto'
]

var emailProviders = [
    'gmail.com',
    'hotmail.com',
    'hotmail.co.uk',
    'mail.com'
]

exports.email = function() {
    return rand(firstNames) + '@' + rand(emailProviders)
}
