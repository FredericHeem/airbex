package 'git' do
end

include_recipe 'deploy_wrapper'
bag = data_bag_item("snow", "main")
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

template "/etc/init/snow-bitcoinin.conf" do
  source "workers/upstart/bitcoinin.conf.erb"
  owner "root"
  group "root"
  mode 00644
end

template "/etc/init/snow-bitcoinout.conf" do
  source "workers/upstart/bitcoinout.conf.erb"
  owner "root"
  group "root"
  mode 00644
end

template "/etc/init/snow-bitcoinaddress.conf" do
  source "workers/upstart/bitcoinaddress.conf.erb"
  owner "root"
  group "root"
  mode 00644
end

template "/etc/init/snow-litecoinin.conf" do
  source "workers/upstart/litecoinin.conf.erb"
  owner "root"
  group "root"
  mode 00644
end

template "/etc/init/snow-litecoinout.conf" do
  source "workers/upstart/litecoinout.conf.erb"
  owner "root"
  group "root"
  mode 00644
end

template "/etc/init/snow-litecoinaddress.conf" do
  source "workers/upstart/litecoinaddress.conf.erb"
  owner "root"
  group "root"
  mode 00644
end

template "/etc/init/snow-ripplein.conf" do
  source "workers/upstart/ripplein.conf.erb"
  owner "root"
  group "root"
  mode 00644
end

template "/etc/init/snow-rippleout.conf" do
  source "workers/upstart/rippleout.conf.erb"
  owner "root"
  group "root"
  mode 00644
end

services = %w(snow-bitcoinin snow-bitcoinout snow-bitcoinaddress snow-litecoinin snow-litecoinout snow-litecoinaddress snow-ripplein snow-rippleout)

# Create services
services.each do |service|
  service service do
    provider Chef::Provider::Service::Upstart
    supports :start => true, :stop => true, :restart => true
    action :enable
  end
end

execute "npm_install" do
  command "npm install"
  user "ubuntu"
  group "ubuntu"
  cwd "#{node[:snow][:workers][:app_directory]}/current/workers"
  action :nothing
end

# Deployment config
deploy_revision node[:snow][:workers][:app_directory] do
    user "ubuntu"
    group "ubuntu"
    repo node[:snow][:repo]
    ssh_wrapper "/home/ubuntu/workers-ssh-wrapper/workers_deploy_wrapper.sh"
    action :deploy
    branch 'master'
    #restart 'sudo initctl restart snow-bitcoinin || sudo initctl start snow-bitcoinin'
    notifies :run, "execute[npm_install]"
    notifies :restart, "service[snow-bitcoinin]"
    notifies :restart, "service[snow-bitcoinout]"
    notifies :restart, "service[snow-bitcoinaddress]"
    notifies :restart, "service[snow-litecoinin]"
    notifies :restart, "service[snow-litecoinout]"
    notifies :restart, "service[snow-litecoinaddress]"
    notifies :restart, "service[snow-ripplein]"
    notifies :restart, "service[snow-rippleout]"
    keep_releases 10
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

template "#{node[:snow][:workers][:app_directory]}/shared/config/workers.json" do
    source 'workers/config.json.erb'
    variables({
        :pgm_conn => "postgres://postgres@#{pgm_ip || '127.0.0.1'}/snow",
        :pgs_conn => "postgres://postgres@#{pgs_ip || '127.0.0.1'}/snow",
        :ripple => env_bag['ripple'],
        :litecoind_ip => litecoind_ip || '127.0.0.1',
        :bitcoind_ip => bitcoind_ip || '127.0.0.1'
    })
    notifies :restart, resources(:service => "snow-bitcoinin")
end

# Start services
services.each do |service|
  service service do
    action :start
  end
end
