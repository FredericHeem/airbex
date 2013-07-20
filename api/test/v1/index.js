require('fs').readdirSync(__dirname)
.forEach(function(fn) {
    if (!fn.match(/\.js$/)) return
    if (fn == 'index.js') return
    require('./' + fn)
})
