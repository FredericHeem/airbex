include_recipe "snow::common"
include_recipe "apt"
include_recipe "nodejs"
include_recipe "postgresql::client"

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

services = %w(logosin logosout logosaddress)
services.each do |service|
  template "/etc/init/snow-#{service}.conf" do
    source "workers/upstart/#{service}.conf.erb"
    owner "root"
    group "root"
    mode 00644
    notifies :restart, "service[snow-#{service}]"
  end
end

# Create services
services.each do |service|
  service "snow-#{service}" do
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
    notifies :restart, "service[snow-logosin]"
    notifies :restart, "service[snow-logosout]"
    notifies :restart, "service[snow-logosaddress]"
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

pgm_ip = search(:node, 'role:pgm').first ? search(:node, 'role:pgm').first[:ipaddress] : nil
pgs_ip = search(:node, 'role:pgs').first ? search(:node, 'role:pgs').first[:ipaddress] : nil
logosd_ip = search(:node, 'role:logosd').first ? search(:node, 'role:logosd').first[:ipaddress] : nil

template "#{node[:snow][:workers_lgs][:app_directory]}/shared/config/workers.json" do
    source 'workers/config-lgs.json.erb'
    variables({
        :website_url => env_bag['api']['website_url'],
        :pgm_ip => pgm_ip || '127.0.0.1',
        :pgs_ip => pgs_ip || '127.0.0.1',
        :logosd_ip => logosd_ip || '127.0.0.1',
        :logos => env_bag['logos'],
        :env_bag => env_bag
    })
    notifies :restart, resources(:service => "snow-logosin")
end

#monit_monitrc "snow-workers" do
#end


