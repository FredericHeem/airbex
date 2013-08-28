#!/bin/sh
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source $DIR/settings.sh

knife role from file roles/api.rb
knife role from file roles/admin.rb
knife role from file roles/reverse.rb
knife role from file roles/workers.rb

knife cookbook upload -a

knife ssh \
    name:app \
    -x ubuntu \
    -a ec2.local_ipv4 \
    -i $SSH_KEY \
    "sudo chef-client --override-runlist \"role[api],role[admin],role[reverse],role[workers]\""
