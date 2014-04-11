include_recipe "apt"
include_recipe "snow::common"

["build-essential", "libssl-dev", "libboost-all-dev", "xfsprogs"].each do |pkg|
    package pkg do
        action :install
    end
end

include_recipe "aws"
aws = Chef::EncryptedDataBagItem.load("aws", 'main')

bag = Chef::EncryptedDataBagItem.load("snow", 'main')
env_bag = bag[node.chef_environment]

directory "/btc" do
    owner "ubuntu"
    group "ubuntu"
    mode 0775
    recursive true
end

if node[:cloud] && node[:cloud][:provider] == 'ec2'
    
    aws_device = "/dev/#{node[:snow][:bitcoind][:aws_device]}"
    os_device = "/dev/#{node[:snow][:bitcoind][:os_device]}"
    
    aws_ebs_volume aws_device do
        aws_access_key aws['aws_access_key_id']
        aws_secret_access_key aws['aws_secret_access_key']
        size node[:snow][:bitcoind][:volume_size]
        device aws_device
        action [ :create, :attach ]
    end
    
    execute "sudo mkfs.xfs #{os_device}" do
      only_if "xfs_admin -l #{os_device} 2>&1 | grep -qx 'xfs_admin: #{os_device} is not a valid XFS filesystem (unexpected SB magic number 0x00000000)'"
    end

    mount "/btc" do
        fstype "xfs"
        device os_device
        action [:mount, :enable]
    end

end

directory "/btc" do
    owner "ubuntu"
    group "ubuntu"
    mode 0775
    recursive true
end


apt_repository "bitcoin" do
  uri "http://ppa.launchpad.net/bitcoin/bitcoin/ubuntu"
  distribution node[:lsb][:codename]
  components ["main"]
  keyserver "pgp.mit.edu"
  key "C300EE8C"
end

execute 'apt-get bitcoind' do
   command 'apt-get -q -y --force-yes install bitcoind=0.9.0-precise1'
   creates "/usr/bin/bitcoind"
end

template "/etc/init/bitcoind.conf" do
  source "bitcoind/service.erb"
  owner "root"
  group "root"
  mode 00644
end

template "/btc/bitcoin.conf" do
  source "crypto.conf.erb"
  variables({
    :username => env_bag['bitcoin']['username'],
    :password => env_bag['bitcoin']['password'],
    :rpcallowip => env_bag['bitcoin']['rpcallowip'] || '127.0.0.1' ,
    :testnet => env_bag['bitcoin']['testnet'] || 0
  })  
  owner "ubuntu"
  group "ubuntu"
  mode 0664
  notifies :restart, "service[bitcoind]"
end

service "bitcoind" do
  provider Chef::Provider::Service::Upstart
  supports :start => true
  action [:enable, :start]
end

monit_monitrc "bitcoind" do
end

# Automatic backups
include_recipe "cron"
include_recipe "snow::ebssnapshot"

cron_d "ebs-snapshot-btc" do
  hour 14
  minute 30
  command "/usr/bin/ebs-snapshot.sh /btc #{node[:snow][:bitcoind][:volume_id]}"
end

diskmonit "btc" do
    path "/btc"
end
