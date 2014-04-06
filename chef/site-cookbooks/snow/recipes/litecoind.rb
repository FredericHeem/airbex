include_recipe "apt"
include_recipe "snow::common"

%w(build-essential libssl-dev libboost-all-dev git libdb5.1-dev libdb5.1++-dev libminiupnpc-dev).each do |pkg|
    package pkg do
        action :install
    end
end

unless File.exists? "/usr/bin/litecoind"
  git "/tmp/litecoin" do
    repository "git://github.com/litecoin-project/litecoin.git"
    reference "fe7b87a9761d9819bc2dcb6796b46b17fa775a5c"
    action :sync
  end

  # Compiling litecoin takes more memory than an AWS t1.micro has (600)
  memory_total_mb = node['memory']['total'][0..-3].to_i / 1024 +
    node['memory']['swap']['total'][0..-3].to_i / 1024

  Chef::Log.warn "Memory total #{memory_total_mb}"

  #swap do
  #  mb 2048
  #  only_if memory_total_mb < 1000
  #end

  bash "install-litecoin" do
    cwd "/tmp/litecoin/src"
    code <<-EOH
    sudo make -f makefile.unix
    EOH
    timeout 360000
    not_if { File.exists? '/tmp/litecoin/src/litecoind' }
  end

  bash "/usr/bin/litecoind" do
    code 'mv -f /tmp/litecoin/src/litecoind /usr/bin/litecoind'
  end

  directory '/tmp/litecoin' do
    recursive true
    action :delete
  end
end

include_recipe "aws"
aws = Chef::EncryptedDataBagItem.load("aws", 'main')
bag = Chef::EncryptedDataBagItem.load("snow", 'main')
env_bag = bag[node.chef_environment]

directory "/ltc" do
  owner "ubuntu"
  group "ubuntu"
  mode 0775
  recursive true
end

if node[:cloud] && node[:cloud][:provider] == 'ec2'
    
    aws_device = "/dev/#{node[:snow][:litecoind][:aws_device]}"
    os_device = "/dev/#{node[:snow][:litecoind][:os_device]}"
    
    aws_ebs_volume aws_device do
        aws_access_key aws['aws_access_key_id']
        aws_secret_access_key aws['aws_secret_access_key']
        size node[:snow][:litecoind][:volume_size]
        device aws_device
        action [ :create, :attach ]
    end
    
    execute "sudo mkfs.xfs #{os_device}" do
      only_if "xfs_admin -l #{os_device} 2>&1 | grep -qx 'xfs_admin: #{os_device} is not a valid XFS filesystem (unexpected SB magic number 0x00000000)'"
    end

    mount "/ltc" do
        fstype "xfs"
        device os_device
        action [:mount, :enable]
    end
end

# Ensure rights
directory "/ltc" do
  owner "ubuntu"
  group "ubuntu"
  mode 0775
end

template "/etc/init/litecoind.conf" do
  source "litecoind/service.erb"
  owner "root"
  group "root"
  mode 00644
  notifies :restart, "service[litecoind]"
end

template "/ltc/litecoin.conf" do
  source "litecoind/litecoin.conf.erb"
  variables({
    :username => env_bag['litecoin']['username'],
    :password => env_bag['litecoin']['password']
  })
  owner "ubuntu"
  group "ubuntu"
  mode 0664
end

service "litecoind" do
  provider Chef::Provider::Service::Upstart
  supports :start => true
  action [:enable, :start]
end

#monit_monitrc "litecoind" do
#end

# Automatic backups
include_recipe "cron"
include_recipe "snow::ebssnapshot"

#cron_d "ebs-snapshot" do
#  hour 14
#  minute 0
#  command "/usr/bin/ebs-snapshot.sh /ltc #{node[:snow][:litecoind][:volume_id]}"
#end

diskmonit "ltc" do
    path "/ltc"
end
