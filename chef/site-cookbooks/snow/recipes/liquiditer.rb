include_recipe "apt"
include_recipe "nodejs"
include_recipe "solo-search"

bag = Chef::EncryptedDataBagItem.load("snow", 'main')
env_bag = bag[node.chef_environment]

ssh_known_hosts_entry 'github.com'

deploy_wrapper 'liquiditer' do
    ssh_wrapper_dir '/home/ubuntu/admin-ssh-wrapper'
    ssh_key_dir '/home/ubuntu/.ssh'
    ssh_key_data bag["github_private_key"]
    owner "ubuntu"
    group "ubuntu"
    sloppy true
end

deploy_revision "/home/ubuntu/liquiditer" do
    user "ubuntu"
    group "ubuntu"
    repo "git@github.com:FredericHeem/metabotex.git"
    branch "master"
    ssh_wrapper "/home/ubuntu/admin-ssh-wrapper/liquiditer_deploy_wrapper.sh"
    action :deploy
    before_symlink do
      bash "npm install" do
        user "root"
        group "root"
        cwd "#{release_path}/"
        code %{
          npm install --production
        }
      end
    end 
    keep_releases 2
    symlinks({})
    symlink_before_migrate({})
    create_dirs_before_symlink([])
    purge_before_symlink([])
end

services = %w(bitstampbtcusd bitfinexbtcusd bitfinexltcbtc bitfinexdrkbtc btceltcbtc)
services.each do |service|
  template "/etc/init/liquiditer-#{service}.conf" do
    source "liquiditer/liquiditer.conf.erb"
    owner "root"
    group "root"
    mode 00644
    variables({
        :service => "#{service}"
    })
    notifies :restart, "service[liquiditer-#{service}]"
  end
end

services.each do |service|
  template "/usr/bin/liquiditer-#{service}.sh" do
    source "liquiditer/liquiditerservice.sh.erb"
    owner "root"
    group "root"
    mode 0755
    variables({
        :service => "#{service}"
    })
  end
end

# Create services
services.each do |service|
  service "liquiditer-#{service}" do
    provider Chef::Provider::Service::Upstart
    supports :start => true, :stop => true, :restart => true
    action [ :enable, :stop, :start ]
  end
end

services.each do |service|
    template "/etc/monit/conf.d/liquiditer-#{service}.monitrc" do
      source "liquiditer/liquiditer.monitrc.erb"
      variables({
        :service => "liquiditer-#{service}"
      })
      owner "ubuntu"
      group "ubuntu"
      mode 0664
    end
end

    