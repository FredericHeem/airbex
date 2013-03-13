#!/bin/sh
sudo git --work-tree=/var/www/snow-api --git-dir=/home/ubuntu/snow-api.git checkout -f
cd /var/www/snow-api
sudo npm install
sudo stop snow-api
sudo start snow-api
