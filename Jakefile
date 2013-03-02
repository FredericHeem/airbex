require('shelljs/global')

task('publish-prod', function() {
    exec({
        'git checkout prod',
        'git merge master',
        'git checkout master',
        'git push ec2prod prod:master'
    })
})
