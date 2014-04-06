exports.bankAccount = function(x) {
    return (x.displayName !== null ? x.displayName + ' (' : '') +
        (x.iban || x.accountNumber) +
        (x.displayName !== null ? ')' : '')
}

exports.escape = function(x) {
    return $('<div>').text(x).html()
}
