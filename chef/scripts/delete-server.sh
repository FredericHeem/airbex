#!/bin/sh
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source $DIR/settings.sh

for i in `knife ec2 server list --region $1 -t VPC | grep -w $2 | grep $VPC | grep running | cut -c -10`
do
    knife ec2 server delete -y --node-name $2 --region $1 --purge $i;
done
