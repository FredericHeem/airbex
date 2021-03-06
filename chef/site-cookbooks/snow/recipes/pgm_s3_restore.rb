include_recipe "snow::common"
include_recipe "apt"
include_recipe "postgresql::server"
include_recipe "postgresql::contrib"
include_recipe "aws"
include_recipe "solo-search"
include_recipe "snow::pgm_s3"

bag = Chef::EncryptedDataBagItem.load("snow", 'main')
env_bag = bag[node.chef_environment]

pgm_ip = env_bag['pgm']['ip'] || "127.0.0.1"

pg_data_path = node[:postgresql][:data_directory]
Chef::Log.info "postgres data path #{pg_data_path}"

# Delete and re-create the data directory
unless File.exists? "#{pg_data_path}/recovery.conf"

  service "postgresql" do
    action :stop
  end
 
  directory pg_data_path do
      action :delete
  end

  directory pg_data_path do
      owner "postgres"
      group "postgres"
      action :create
  end

  backup_fetch_command = "envdir /etc/wal-e.d/env-restore /usr/local/bin/wal-e backup-fetch #{pg_data_path} LATEST"
      
  Chef::Log.info "fetch latest backup from s3 for recover server"
  execute "wal-e fetch latest backup" do
    user "postgres"
    group "postgres"
    command backup_fetch_command
  end

  template "#{pg_data_path}/recovery.conf" do
    source 'pgs/recovery.conf.erb'
    owner "postgres"
    group "postgres"
    mode 0664
    variables :master_ip => pgm_ip
  end

  service 'postgresql' do
      action [:enable, :start]
  end
  
  file "#{pg_data_path}/postgresql.trigger" do
    owner "postgres"
    group "postgres"
    mode "0755"
    action :create
  end  
  
end
