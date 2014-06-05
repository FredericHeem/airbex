# Save Write Ahead Log to Amazon s3
include_recipe "aws"
include_recipe "awscli"
include_recipe "cron"
include_recipe "chef-s3cmd"

aws = Chef::EncryptedDataBagItem.load("aws", 'main')
bag = Chef::EncryptedDataBagItem.load("snow", 'main')
env_bag = bag[node.chef_environment]

["daemontools", "lzop", "pv"].each do |pkg|
    package pkg do
        action :install
    end
end

execute 'pip install wal-e' do
   command 'pip install wal-e==0.7.0'
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

directory "/etc/wal-e.d/env-restore" do
    owner "root"
    group "postgres"
end

["/etc/wal-e.d/env/AWS_ACCESS_KEY_ID","/etc/wal-e.d/env-restore/AWS_ACCESS_KEY_ID"].each do |key| 
    file key do
      content aws['aws_access_key_id']
      mode '640'
      owner "root"
      group "postgres"
      action :create
    end
end


["/etc/wal-e.d/env/AWS_SECRET_ACCESS_KEY","/etc/wal-e.d/env-restore/AWS_SECRET_ACCESS_KEY"].each do |secret|
    file secret do
      content aws['aws_secret_access_key']
      mode '640'
      owner "root"
      group "postgres"
      action :create
    end
end

["/etc/wal-e.d/env/WALE_GPG_KEY_ID"].each do |secret|
    file secret do
      content env_bag['pgp']['recipient']
      mode '640'
      owner "root"
      group "postgres"
      action :create
    end
end

s3_bucket = env_bag['pgm_s3']['s3_bucket']
if s3_bucket
    file "/etc/wal-e.d/env/WALE_S3_PREFIX" do
      content "s3://#{s3_bucket}"
      mode '640'
      owner "root"
      group "postgres"
      action :create
    end
end 

s3_bucket_restore = env_bag['pgm_s3']['s3_bucket_restore']
if s3_bucket_restore.nil? 
    s3_bucket_restore = env_bag['pgm_s3']['s3_bucket']
end

if s3_bucket_restore 
    file "/etc/wal-e.d/env-restore/WALE_S3_PREFIX" do
      content "s3://#{s3_bucket_restore}"
      mode '640'
      owner "root"
      group "postgres"
      action :create
    end
end

cron_d "wal-backup-s3" do
  minute 0
  user 'postgres'
  command "/usr/bin/envdir /etc/wal-e.d/env /usr/local/bin/wal-e backup-push /pgmdata/main"
end

include_recipe "iptables"
iptables_rule "iptables_s3" do
end
