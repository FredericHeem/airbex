#!/usr/bin/env bash
#
# Usage: scripts/update.sh environment node role
# Example: scripts/update.sh staging bitcoind
#

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
export KNIFE_ENV=$1
source $DIR/settings.sh

echo Updating role $3 of node $2 in $1 environment

knife environment from file $1.json
knife role from file roles/$3.rb

knife cookbook upload -a

knife ssh \
    name:$2 \
    -x ubuntu \
    -a ec2.local_ipv4 \
    -i $SSH_KEY \
    "sudo chef-client --log_level=info --override-runlist \"role[$3]\""
