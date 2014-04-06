# Save Write Ahead Log to Amazon s3
include_recipe "aws"
include_recipe "awscli"

aws = Chef::EncryptedDataBagItem.load("aws", 'main')
bag = Chef::EncryptedDataBagItem.load("snow", 'main')
env_bag = bag[node.chef_environment]

["daemontools", "lzop", "pv"].each do |pkg|
    package pkg do
        action :install
    end
end

execute 'pip install wal-e' do
   command 'pip install wal-e'
   creates "/usr/local/bin/wal-e"
end

directory "/etc/wal-e.d" do
    owner "root"
    group "postgres"
end
  
directory "/etc/wal-e.d/env" do
    owner "root"
    group "postgres"
end

file "/etc/wal-e.d/env/AWS_ACCESS_KEY_ID" do
  content aws['aws_access_key_id']
  mode '640'
  owner "root"
  group "postgres"
  action :create
end

file "/etc/wal-e.d/env/AWS_SECRET_ACCESS_KEY" do
  content aws['aws_secret_access_key']
  mode '640'
  owner "root"
  group "postgres"
  action :create
end

file "/etc/wal-e.d/env/WALE_S3_PREFIX" do
  content "s3://#{env_bag['pgm_s3']['s3_bucket']}"
  mode '640'
  owner "root"
  group "postgres"
  action :create
end

cron_d "wal-backup-s3" do
  hour 15
  minute 0
  user 'postgres'
  command "/usr/bin/envdir /etc/wal-e.d/env /usr/local/bin/wal-e backup-push /pgmdata/main"
end
