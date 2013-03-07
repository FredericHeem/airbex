require('shelljs/global')

task('test', function() {
    jake.exec('mocha -R spec', { printStderr: true, printStdout: true } )
})

task('publish-prod', function() {
    jake.exec([
        'git checkout prod',
        'git merge master',
        'git checkout master',
        'git push prod prod:master'
    ], { printStderr: true })
})
