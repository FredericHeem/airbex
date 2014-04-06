#
# Cookbook Name:: awscli
# Recipe:: default
#
# Copyright 2013, EJ Bensing
#
# All rights reserved - FreeBSD license, blah blah
#

# make sure python and pip are installed
include_recipe "python"

#add the awscli
python_pip "awscli"


