#!/usr/bin/env bash
export REGION=eu-west-1
export AZ=${REGION}c
export PRIVATE_SUBNET=subnet-2dffe94f
export PUBLIC_SUBNET=subnet-2dffe94f
export PUBLIC_IP_ADDRESS=54.194.25.87
export DOMAIN_NAME=swissmybitcoin.com

#Ubuntu Server 12.04.3 LTS - (64-bit)
export AMI="ami-8e987ef9"

export SSH_KEY=$HOME/.ssh/sbex-solo-aws.pem
export SSH_KEY_NAME=sbex-solo-aws
export SSH_GATEWAY=54.194.25.87
export VPC=vpc-63e5f201

export SBEX_SOLO_PRIVATE_IP=172.31.16.100
export SBEX_SOLO_INSTANCE_TYPE=m1.small
export SBEX_SOLO_SECURITY_GROUP=sg-e0f2ee82

export PGS_INSTANCE_TYPE=m1.small
export PGS_SECURITY_GROUP=sg-fa2c3398

export BITCOIND_INSTANCE_TYPE=m1.small
export BITCOIND_SECURITY_GROUP=sg-e97c638b
