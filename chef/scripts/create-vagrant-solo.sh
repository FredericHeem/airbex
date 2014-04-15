#!/usr/bin/env bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source $DIR/settings.sh


knife bootstrap localhost -p 2222 -x vagrant -P vagrant --sudo \
    --run-list 'role[solo-logos]' \
    --environment dev \
    --node-name "snow-dev"