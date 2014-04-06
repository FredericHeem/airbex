#!/usr/bin/env bash
# Upload everything to the chef server: environments, roles, cookbooks and data bags
# Usage: scripts/chef-upload-all.sh
# Note: Must be in the chef directory
#

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

knife environment from file environments/*.json

knife role from file roles/*.rb

knife cookbook upload -a


