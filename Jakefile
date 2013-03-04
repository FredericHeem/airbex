require('shelljs/global')

task('test', function() {
    jake.exec('mocha -R spec -b')
})

task('publish-prod', ['test'], function() {
    exec({
        'heroku publish'
    })
})
