#!/bin/bash


#Ubuntu user password
ubuntupwd="ubuntu"

#Bitcoin settings
bitcoinuser="bitcoinrpc"
bitcoinport="8332"
bitcoinpwd="correcthorsebatterystaple"


#Set user ubuntu password
echo "ubuntu:$ubuntupwd" | chpasswd

# Auto update time
echo "ntpdate ntp.ubuntu.com" | sudo tee /etc/cron.daily/ntpdate
sudo chmod 755 /etc/cron.daily/ntpdate

#Install required packages
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install -y python-software-properties
sudo add-apt-repository -y ppa:bitcoin/bitcoin
sudo apt-get update
sudo apt-get install -y bitcoind

# bitcoind upstart script for Ubuntu
tee  /etc/init/bitcoind.conf << EOL
description "Bitcoin daemon"

start on runlevel [2345]
stop on runlevel [!2345]

respawn
exec su -c "/usr/bin/bitcoind" - ubuntu
EOL

sudo -u 'ubuntu' mkdir /home/ubuntu/.bitcoin

tee  /home/ubuntu/.bitcoin/bitcoin.conf << EOL
rpcuser=${bitcoinrpc}
rpcpassword=${bitcoinpwd}
server=1
rpctimeout=30
rpcallowip=*
rpcport=${bitcoinport}
gen=0
EOL

sudo service bitcoind start