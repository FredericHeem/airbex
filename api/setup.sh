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


install node (with binary support), npm, monit, pg bindings
```
sudo add-apt-repository ppa:chris-lea/node.js -y
sudo apt-get update  -y
sudo apt-get install nodejs npm g++ make nodejs-dev git libpq-dev monit postfix -y
