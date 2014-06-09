include_recipe "snow::common"
include_recipe "apt"
include_recipe "aws"
include_recipe "awscli"
include_recipe "snow::db_disk"
include_recipe "cron"

aws = Chef::EncryptedDataBagItem.load("aws", 'main')
bag = Chef::EncryptedDataBagItem.load("snow", 'main')
env_bag = bag[node.chef_environment]
    
include_recipe "postgresql::server"
include_recipe "postgresql::contrib"

if env_bag['pgm_s3']
    include_recipe "snow::pgm_s3"
    include_recipe "snow::pg_dump_s3"
end

service 'postgresql' do
    action [:enable, :start]
end

pg_user "postgres" do
    privileges :superuser => true
    password env_bag['pg_password']
end

pg_user "snow" do
    privileges :superuser => false, :createdb => false, :login => true
    password env_bag["pg_write_url"]["password"]
end

pg_user "snowro" do
    privileges :superuser => false, :createdb => false, :login => true
    password env_bag["pg_read_url"]["password"]
end

pg_database "snow" do
    owner "snow"
    encoding "utf8"
    template "template0"
    locale "en_US.UTF8"
end

pg_database_extensions "snow" do
    languages "plpgsql"             
    extensions ["hstore"]
end

# Automatic backups

if node[:cloud] && node[:cloud][:ec2]
    include_recipe "snow::ebssnapshot"
    
    cron_d "ebs-snapshot-db-snow" do
      hour 15
      minute 0
      command "/usr/bin/ebs-snapshot.sh /pgmdata #{node[:snow][:pgm][:volume_id]}"
    end
end


include_recipe "iptables"
iptables_rule "iptables_pgm" do
end

diskmonit "pgmdata" do
    path "/pgmdata"
end
