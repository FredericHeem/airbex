master_ip = search(:node, 'role:pgm').first[:ipaddress]

# Delete and re-create the data directory
unless File.exists? "#{node[:postgresql][:data_directory]}/backup_label"
  directory node[:postgresql][:data_directory] do
      action :delete
  end

  directory node[:postgresql][:data_directory] do
      owner "postgres"
      group "postgres"
      action :create
  end

  bash 'basebackup' do
    user "postgres"
    code <<-EOH
    pg_basebackup -h #{master_ip} -D #{node[:postgresql][:data_directory]} -U postgres
    EOH
  end
end

template "#{node[:postgresql][:data_directory]}/recovery.conf" do
  source 'pgs/recovery.conf.erb'
  owner "postgres"
  group "postgres"
  mode 0664
  variables :master_ip => master_ip
end

service 'postgresql' do
    action [:enable, :start]
end
