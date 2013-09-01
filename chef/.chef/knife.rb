require 'librarian/chef/integration/knife'

current_dir = File.dirname(__FILE__)

log_level                :info
log_location             STDOUT
node_name                'andreas'
client_key               "#{current_dir}/andreas.pem"
validation_client_name   "chef-validator"
validation_key           "#{current_dir}/justcoin-validator.pem"
chef_server_url          'https://chef.internal.justcoin.com'
cookbook_path             Librarian::Chef.install_path, "#{current_dir}/../site-cookbooks"

knife[:aws_ssh_key_id] = ENV['AWS_SSH_KEY_ID']
knife[:aws_access_key_id] = ENV['AWS_ACCESS_KEY_ID']
knife[:aws_secret_access_key] = ENV['AWS_SECRET_ACCESS_KEY']
