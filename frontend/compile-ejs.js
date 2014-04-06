var ejs = require('ejs')
, path = require('path')
, fs = require('fs')
, fn = path.join(__dirname, 'assets/index.ejs')

console.log(ejs.render(fs.readFileSync(fn, 'utf8'), {
    segment: process.env.SEGMENT,
    timestamp: +new Date()
}))
