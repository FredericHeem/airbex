#!/usr/bin/env bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source $DIR/settings.sh

source $DIR/delete-server.sh $REGION reverse

# Remove all 10.0.0.0/16 from ssh known_hosts
cat ~/.ssh/known_hosts | grep -vE '^10.0.' | tee ~/.ssh/known_hosts

set -x
knife ec2 server create \
    -V \
    --image $AMI \
    --environment $1 \
    --region $REGION \
    --flavor $REVERSE_INSTANCE_TYPE \
    --identity-file $SSH_KEY \
    --security-group-ids $REVERSE_SECURITY_GROUP \
    --subnet $PUBLIC_SUBNET \
    --ssh-user ubuntu \
    --server-connect-attribute private_ip_address \
    --availability-zone $AZ \
    --node-name reverse \
    --tags VPC=$VPC
#    --run-list "role[reverse]"
#    --elastic-ip 54.229.133.52 \
set +x

source $DIR/update.sh reverse
