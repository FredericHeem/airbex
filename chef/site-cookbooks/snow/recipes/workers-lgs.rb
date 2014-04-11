include_recipe "snow::common"
include_recipe "apt"
include_recipe "nodejs"
include_recipe "postgresql::client"

cryptoName = "logos"
cryptoCode = "LGS"

package 'git' do
end

include_recipe 'deploy_wrapper'
bag = Chef::EncryptedDataBagItem.load("snow", 'main')
env_bag = bag[node.chef_environment]

ssh_known_hosts_entry 'github.com'

deploy_wrapper 'workers' do
    ssh_wrapper_dir '/home/ubuntu/workers-ssh-wrapper'
    ssh_key_dir '/home/ubuntu/.ssh'
    ssh_key_data bag["github_private_key"]
    owner "ubuntu"
    group "ubuntu"
    sloppy true
end

services = %w(in out address)
services.each do |service|
  template "/etc/init/snow-#{cryptoName}#{service}.conf" do
    source "workers/upstart/crypto#{service}.conf.erb"
    owner "root"
    group "root"
    mode 00644
    variables({
        :service => "snow-#{cryptoName}#{service}"
    })
    notifies :restart, "service[snow-#{cryptoName}#{service}]"
  end
end

# Create services
services.each do |service|
  service "snow-#{cryptoName}#{service}" do
    provider Chef::Provider::Service::Upstart
    supports :start => true, :stop => true, :restart => true
    action :enable
  end
end

# Deployment config
deploy_revision node[:snow][:workers_lgs][:app_directory] do
    user "ubuntu"
    group "ubuntu"
    repo env_bag["repository"]["main"]
    ssh_wrapper "/home/ubuntu/workers-ssh-wrapper/workers_deploy_wrapper.sh"
    action :deploy
    branch node[:snow][:branch]
    before_symlink do
      bash "npm install" do
        user "root"
        group "root"
        cwd "#{release_path}/workers"
        code %{
          npm install
        }
      end
    end
    notifies :restart, "service[snow-#{cryptoName}in]"
    notifies :restart, "service[snow-#{cryptoName}out]"
    notifies :restart, "service[snow-#{cryptoName}address]"
    keep_releases 2
    symlinks({
         "config/workers.json" => "workers/config/#{node.chef_environment}.json"
    })
    symlink_before_migrate({})
    create_dirs_before_symlink(['workers', 'workers/config'])
    purge_before_symlink([])
end

# Application config
directory "#{node[:snow][:workers_lgs][:app_directory]}/shared" do
  owner "ubuntu"
  group "ubuntu"
end

directory "#{node[:snow][:workers_lgs][:app_directory]}/shared/config" do
  owner "ubuntu"
  group "ubuntu"
end

role = "role:#{cryptoName}d"

pgm_ip = search(:node, 'role:pgm').first ? search(:node, 'role:pgm').first[:ipaddress] : nil
pgs_ip = search(:node, 'role:pgs').first ? search(:node, 'role:pgs').first[:ipaddress] : nil
cryptod_ip = search(:node, role).first ? search(:node, role).first[:ipaddress] : nil

template "#{node[:snow][:workers_lgs][:app_directory]}/shared/config/workers.json" do
    source 'workers/config-lgs.json.erb'
    variables({
        :website_url => env_bag['api']['website_url'],
        :pgm_ip => pgm_ip || '127.0.0.1',
        :pgs_ip => pgs_ip || '127.0.0.1',
        :cryptod_ip => cryptod_ip || '127.0.0.1',
        :crypto => env_bag[cryptoName],
        :env_bag => env_bag,
        :currency => cryptoCode
    })
    notifies :restart, resources(:service => "snow-#{cryptoName}in")
end

#monit_monitrc "snow-workers" do
#end


