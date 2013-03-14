#!/bin/sh
name=snow-api
cd ~/$name
git --work-tree=./app --git-dir=./repo checkout -f
cd app
npm install
sudo stop $name
sudo start $name
