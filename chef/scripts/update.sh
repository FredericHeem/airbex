#!/bin/sh
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source $DIR/settings.sh

knife role from file roles/$1.rb

knife cookbook upload -a

knife ssh \
    name:$1 \
    -x ubuntu \
    -a ec2.local_ipv4 \
    -i $SSH_KEY \
    "sudo chef-client --override-runlist \"role[$1]\""
