#!/bin/sh
cd ~/snow-api
git --work-tree=~./app --git-dir=./repo checkout -f
npm install
sudo stop snow-api
sudo start snow-api
