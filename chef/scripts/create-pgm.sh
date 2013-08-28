#!/bin/sh
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source $DIR/settings.sh

source $DIR/delete-server.sh $REGION pgm

# Remove all 10.0.0.0/16 from ssh known_hosts
cat ~/.ssh/known_hosts | grep -vE '^10.0.' | tee ~/.ssh/known_hosts

knife ec2 server create \
    -V \
    --image $AMI \
    --region $REGION \
    --flavor $PGM_INSTANCE_TYPE \
    --environment $1 \
    --identity-file $SSH_KEY \
    --security-group-ids $PGM_SECURITY_GROUP \
    --subnet $PRIVATE_SUBNET \
    --ssh-user ubuntu \
    --server-connect-attribute private_ip_address \
    --availability-zone $AZ \
    --node-name pgm \
    --tags VPC=$VPC

source $DIR/update.sh pgm
