sudo apt-get update -y
sudo apt-get upgrade -y

sudo apt-get install -y libdb++-dev git build-essential libboost-all-dev make postfix

cd ~
git clone git://github.com/litecoin-project/litecoin.git
cd litecoin/src

# Requires quite a lot of memory (medium instance on EC2)
make -f makefile.unix USE_UPNP=- litecoind

sudo cp litecoind /usr/bin/litecoind
mkdir ~/.litecoin

sudo apt-get install -y monit

# Change computer name to snowprodltc
# http://www.subvs.co.uk/ubuntu_change_hostname_computer_name
