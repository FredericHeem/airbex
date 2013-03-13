# Ubuntu ebs (8gb) from http://alestic.com/
# Zone: eu-west-1a
# Type: t1 micro
# key pair: snow-production
# sec group: snow-production-api
#	port 8000 open from all
#	ssh open from all
#
# 
#


install node
```
sudo add-apt-repository ppa:chris-lea/node.js -y
sudo apt-get update  -y
sudo apt-get install nodejs npm g++ make nodejs-dev -y
```

install git
```
sudo apt-get install git -y
```

install libpq-dev for postgres native
```
sudo apt-get install libpq-dev -y
```

monit
```
sudo apt-get install monit -y
