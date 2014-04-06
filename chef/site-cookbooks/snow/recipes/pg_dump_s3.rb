aws = Chef::EncryptedDataBagItem.load("aws", 'main')

if aws['aws_access_key_id']
  include_recipe "s3cmd"

  template "/usr/bin/pg_dump_s3.sh" do
    source "pg_dump_s3.sh.erb"
    owner "postgres"
    group "postgres"
    mode 0755
    variables({
        :snow_bag => Chef::EncryptedDataBagItem.load("snow", 'main'),
	:env => node.chef_environment
    })
    variables 
  end

  cookbook_file "/home/ubuntu/SbexSecurity.pubkey.gpg" do
    source "SbexSecurity.pubkey.gpg"
  end

  cron_d "pg_dump_s3" do
    hour 15
    minute 0
    user "postgres"
    command "/usr/bin/pg_dump_s3.sh"
  end

end

