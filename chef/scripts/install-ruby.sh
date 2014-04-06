#!/usr/bin/env bash
sudo apt-get -y update
sudo apt-get -y install build-essential zlib1g-dev libssl-dev libxml2-dev libxslt-dev libreadline6-dev libyaml-dev
cd /tmp/
wget http://cache.ruby-lang.org/pub/ruby/1.9/ruby-1.9.3-p484.tar.gz
tar -xvzf ruby-1.9.3-p484.tar.gz
cd ruby-1.9.3-p484/
./configure --prefix=/usr/local
make
sudo make install
sudo apt-get install -y ruby1.9.1-dev
sudo gem install bundler
sudo gem install librarian-chef
