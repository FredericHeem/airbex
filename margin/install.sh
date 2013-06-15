# You can run this script using:
# bash <(curl -s https://raw.github.com/justcoin/snow/master/margin/install.sh)
#
# Run this script to install the margin trader on Ubuntu
# Recommended AMI:
# Ubuntu 12.04 LTS Precise (instance-store), AMI ami-5f98882b
# https://console.aws.amazon.com/ec2/home?region=eu-west-1#launchAmi=ami-5f98882b
#
# After installation, vim text editor will open and let you
# enter your API key. You can obtain an API key from:
# https://justcoin.com/#apiKeys
#
# The configuration provided below (around line 49)
# has a volume of 1 BTC and a margin of 0.1, 10% of MtGox BTCUSD price converted
# to BTCNOK using Google's currency converter.
#
# The trader is very simple, has no state, and simply ignores not having enough
# funds to cover an order. Pull requests welcome.

# Switch hostname to Margin
echo "127.0.0.1 margin" | sudo tee -a /etc/hosts
sudo hostname margin

# Upgrade system
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js
echo | sudo add-apt-repository ppa:chris-lea/node.js
sudo apt-get update
sudo apt-get install -y python-software-properties python g++ make nodejs

echo "176.9.79.196 api.bitcoincharts.com" | sudo tee -a /etc/hosts

cd ~

# Install forever-daemon
sudo npm install -g forever
sudo rm -rf .npm tmp

# Install margin
npm install margin

cd node_modules/margin

# Config
tee config.json << EOL
{
    "positions": [
        {
            "pair": "BTCNOK",
            "volume": 1,
            "margin": 0.1,
            "from": {
                "type": "fx",
                "ref": "USD",
                "inner": {
                    "type": "bitcoincharts"
                }
            },
            "to": {
                "type": "snow"
            }
        }
    ],
    "snow": {
        "key": "TODO API KEY"
    }
}
EOL

# Open text editor to allow
vim config.json

# Start margin trader
forever start bin/margin

# Done, show status of trader
forever list

# Show live log output (cancel with CTRL-C)
cd ~/.forever
tail -fn 50 `ls -tr | grep .log`
