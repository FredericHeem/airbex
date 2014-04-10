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

#services = %w(bitcoinin bitcoinbridge bitcoinout bitcoinaddress litecoinin litecoinout litecoinaddress ripplein rippleout metrics)
services = %w(bitcoinin bitcoinout bitcoinaddress litecoinin litecoinout litecoinaddress)
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
deploy_revision node[:snow][:workers][:app_directory] do
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
    notifies :restart, "service[snow-bitcoinin]"
    notifies :restart, "service[snow-bitcoinout]"
    notifies :restart, "service[snow-bitcoinaddress]"
    notifies :restart, "service[snow-litecoinin]"
    notifies :restart, "service[snow-litecoinout]"
    notifies :restart, "service[snow-litecoinaddress]"
    keep_releases 2
    symlinks({
         "config/workers.json" => "workers/config/#{node.chef_environment}.json"
    })
    symlink_before_migrate({})
    create_dirs_before_symlink(['workers', 'workers/config'])
    purge_before_symlink([])
end

# Application config
directory "#{node[:snow][:workers][:app_directory]}/shared" do
  owner "ubuntu"
  group "ubuntu"
end

directory "#{node[:snow][:workers][:app_directory]}/shared/config" do
  owner "ubuntu"
  group "ubuntu"
end

pgm_ip = search(:node, 'role:pgm').first ? search(:node, 'role:pgm').first[:ipaddress] : nil
pgs_ip = search(:node, 'role:pgs').first ? search(:node, 'role:pgs').first[:ipaddress] : nil
bitcoind_ip = search(:node, 'role:bitcoind').first ? search(:node, 'role:bitcoind').first[:ipaddress] : nil
litecoind_ip = search(:node, 'role:litecoind').first ? search(:node, 'role:litecoind').first[:ipaddress] : nil
rippled_ip = search(:node, 'role:rippled').first ? search(:node, 'role:rippled').first[:ipaddress] : nil

template "#{node[:snow][:workers][:app_directory]}/shared/config/workers.json" do
    source 'workers/config.json.erb'
    variables({
        :pgm_ip => pgm_ip || '127.0.0.1',
        :pgs_ip => pgs_ip || '127.0.0.1',
        :website_url => env_bag['api']['website_url'],
        :ripple => env_bag['ripple'],
        :litecoind_ip => litecoind_ip || '127.0.0.1',
        :rippled_ip => rippled_ip || '127.0.0.1',
        :bitcoind_ip => bitcoind_ip || '127.0.0.1',
        :bitcoin => env_bag['bitcoin'],
        :litecoin => env_bag['litecoin'],
        :armory => env_bag['armory'],
        :env_bag => env_bag
    })
    notifies :restart, resources(:service => "snow-bitcoinin")
    notifies :restart, resources(:service => "snow-litecoinin")
end

monit_monitrc "snow-workers" do
end

template "/usr/bin/liability-proof.sh" do
    source "liability-proof.sh.erb"
    owner "root"
    group "root"
    mode 0755
end

cron_d "liability-proof" do
  hour 14
  minute 30
  command "/usr/bin/liability-proof.sh"
end

