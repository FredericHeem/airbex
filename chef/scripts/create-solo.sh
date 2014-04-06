#!/usr/bin/env bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
export KNIFE_ENV=$1
source $DIR/settings.sh

source $DIR/delete-server.sh $REGION sbex-solo

# Remove all 10.0.0.0/16 from ssh known_hosts
cat ~/.ssh/known_hosts | grep -vE '^10.0.' | tee ~/.ssh/known_hosts

knife ec2 server create \
    -r 'role[solo]' \
    -V \
    --image $AMI \
    --environment $1 \
    --region $REGION \
    --flavor $SBEX_SOLO_INSTANCE_TYPE \
    --identity-file $SSH_KEY \
    --security-group-ids $SBEX_SOLO_SECURITY_GROUP \
    --ssh-user ubuntu \
    --availability-zone $AZ \
    --node-name sbex-solo \
    --tags VPC=$VPC 
