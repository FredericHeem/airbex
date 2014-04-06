#!/usr/bin/env bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
export KNIFE_ENV=$1
source $DIR/settings.sh

source $DIR/delete-server.sh $REGION bitcoind

# Remove all 10.0.0.0/16 from ssh known_hosts
cat ~/.ssh/known_hosts | grep -vE '^10.0.' | tee ~/.ssh/known_hosts

knife ec2 server create \
    -V \
    --run-list 'role[bitcoind]' \
    --image $AMI \
    --environment $1 \
    --region $REGION \
    --flavor $BITCOIND_INSTANCE_TYPE \
    --identity-file $SSH_KEY \
    --security-group-ids $BITCOIND_SECURITY_GROUP \
    --subnet $PRIVATE_SUBNET \
    --ssh-user ubuntu \
    --server-connect-attribute private_ip_address \
    --ssh-gateway ubuntu@$SSH_GATEWAY \
    --availability-zone $AZ \
    --node-name bitcoind \
    --tags VPC=$VPC

#source $DIR/update.sh bitcoind
