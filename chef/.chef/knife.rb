#require 'librarian/chef/integration/knife'

current_dir = File.dirname(__FILE__)

log_level                :info
log_location             STDOUT
node_name                ENV['KNIFE_USER']
client_key               "#{current_dir}/#{ENV['KNIFE_USER']}.#{ENV['KNIFE_ENV']}.pem"
validation_client_name   "sbex-validator"
validation_key           "#{current_dir}/validator.#{ENV['KNIFE_ENV']}.pem"
chef_server_url          ENV['CHEF_SERVER_URL']
cookbook_path            "#{current_dir}/../cookbooks" , "#{current_dir}/../site-cookbooks"
knife[:secret_file] = "#{current_dir}/encrypted_data_bag_secret"
knife[:aws_ssh_key_id] = ENV['AWS_SSH_KEY_ID']
knife[:aws_access_key_id] = ENV['AWS_ACCESS_KEY_ID']
knife[:aws_secret_access_key] = ENV['AWS_SECRET_ACCESS_KEY']
