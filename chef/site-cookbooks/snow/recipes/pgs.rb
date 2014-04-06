include_recipe "snow::common"
include_recipe "apt"
include_recipe "postgresql::server"
include_recipe "postgresql::contrib"
include_recipe "aws"
include_recipe "solo-search"
include_recipe "snow::db_disk"

master_ip = search(:node, 'role:pgm').first ? search(:node, 'role:pgm').first[:ipaddress] : "127.0.0.1"

pg_data_path = node[:postgresql][:data_directory]
Chef::Log.info "postgres data path #{pg_data_path}"

# Delete and re-create the data directory
unless File.exists? "#{pg_data_path}/recovery.conf"
  directory pg_data_path do
      action :delete
  end

  service "postgresql" do
    action :stop
  end

  directory pg_data_path do
      owner "postgres"
      group "postgres"
      action :create
  end

  bash 'basebackup' do
    user "postgres"
    code <<-EOH
    pg_basebackup -h #{master_ip} -D #{pg_data_path} -U postgres
    EOH
  end

  template "#{pg_data_path}/recovery.conf" do
    source 'pgs/recovery.conf.erb'
    owner "postgres"
    group "postgres"
    mode 0664
    variables :master_ip => master_ip
  end

  service 'postgresql' do
      action [:enable, :start]
  end
end
