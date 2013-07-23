# Ubuntu 12.04 ebs (8gb) from http://alestic.com/
# Zone: eu-west-1a
# Security group: prod-workers

echo "127.0.0.1 workers" | sudo tee -a /etc/hosts
sudo hostname workers

export environment=production

sudo apt-get update
sudo apt-get upgrade -y

# Node.js
echo | sudo add-apt-repository ppa:chris-lea/node.js
sudo apt-get update
sudo apt-get install -y python-software-properties python g++ make nodejs

# PostgreSQL driver
echo | sudo add-apt-repository ppa:pitti/postgresql
sudo apt-get update
sudo apt-get install -y libpq-dev

cd ~
mkdir snow-workers
cd snow-workers
mkdir app log

tee app/deploy.sh << EOL
#!/bin/bash
mkdir \$1
cd \$1
tar --strip-components=1 -zxvf ../snow-workers-\$1.tgz
rm ../snow-workers-\$1.tgz
cp ../../config.${environment}.json .
npm install
cd ..
rm current
ln -s \$1 current
sudo stop snow-workers
sudo start snow-workers
EOL

chmod +x app/deploy.sh

# Git (needed by NPM)
sudo apt-get install -y git

# Upstart
sudo tee /etc/init/snow-workers.conf << EOL
setuid ubuntu
env HOME=/home/ubuntu
env name="snow-workers"
start on startup
stop on shutdown

script
    cd ~/\$name
    echo \$\$ > \$name.pid
    export DEBUG="*"
    export NODE_ENV=${environment}
    cp config.\$NODE_ENV.json app/current
    cd app/current
    node ./bin/all >> ../../log/\$name.log 2>&1
end script

pre-stop script
    rm ~/\$name/\$name.pid
end script
EOL

# Monit
sudo apt-get install monit -y

sudo tee /etc/monit/monitrc << EOL
set daemon 120
set logfile syslog
#set alert a@abrkn.com
set mail-format { from: webmaster@${environment}.snow }
set mailserver localhost

set httpd port 2812
  allow localhost

include /etc/monit/conf.d/*
EOL

sudo tee /etc/monit/conf.d/snow-workers << EOL
check process snow-workers
    with pidfile /home/ubuntu/snow-workers/snow-workers.pid
    start program = "/sbin/start snow-workers"
    stop program = "/sbin/stop snow-workers"
EOL

# Config
tee ~/snow-workers/config.${environment}.json << EOL
{
    "pg_url": "postgres://TODO",
    "pg_native": true,
    "btc_host": "10.0.1.51",
    "btc_port": 19701,
    "btc_user": "bitcoinrpc",
    "btc_pass": "TODO",
    "btc_minconf": 6,
    "ltc_host": "10.0.1.25",
    "ltc_port": 19602,
    "ltc_user": "litecoinrpc",
    "ltc_pass": "TODO",
    "ltc_minconf": 6,
    "ripple_uri": "wss://s2.ripple.com:51233",
    "ripple_account": "rJHygWcTLVpSXkowott6kzgZU6viQSVYM1",
    "ripple_secret": "TODO",
    "raven": "TODO"
}
EOL

vim ~/snow-workers/config.${environment}.json

sudo reboot

########################################################################
#
# MUST DO FIRST PUSH AT THIS POINT:
# git push ${environment} +${environment}:refs/heads/master
#
# Subsequent pushes can be done with git push ${environment} ${environment}:master
#
########################################################################

