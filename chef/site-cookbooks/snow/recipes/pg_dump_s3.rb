aws = Chef::EncryptedDataBagItem.load("aws", 'main')
bag = Chef::EncryptedDataBagItem.load("snow", 'main')
env_bag = bag[node.chef_environment]

if aws['aws_access_key_id']
  include_recipe "chef-s3cmd"

  template "/usr/bin/pg_dump_s3.sh" do
    source "pg_dump_s3.sh.erb"
    owner "postgres"
    group "postgres"
    mode 0755
    variables({
        :env_bag => env_bag,
        :env => node.chef_environment
    })
    variables 
  end

  cookbook_file "/home/ubuntu/#{env_bag['pgp']['public_key']}" do
    source "#{env_bag['pgp']['public_key']}"
  end

  cron_d "pg_dump_s3" do
    hour 15
    minute 0
    user "postgres"
    command "/usr/bin/pg_dump_s3.sh"
  end

end

