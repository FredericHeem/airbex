#!/bin/sh
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source $DIR/settings.sh

source $DIR/delete-server.sh $REGION pgs

# Remove all 10.0.0.0/16 from ssh known_hosts
cat ~/.ssh/known_hosts | grep -vE '^10.0.' | tee ~/.ssh/known_hosts

set -x
knife ec2 server create \
    -V \
    --run-list 'role[pgs],role[pgs]' \
    --environment $1 \
    --image $AMI \
    --region $REGION \
    --flavor $PGS_INSTANCE_TYPE \
    --identity-file $SSH_KEY \
    --security-group-ids $PGS_SECURITY_GROUP \
    --subnet $PRIVATE_SUBNET \
    --ssh-user ubuntu \
    --server-connect-attribute private_ip_address \
    --availability-zone $AZ \
    --node-name pgs \
    --tags VPC=$VPC
set +x

source $DIR/update.sh pgs
