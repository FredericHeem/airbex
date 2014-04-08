include_recipe "apt"
include_recipe "snow::common"

%w(build-essential libssl-dev libboost-all-dev git libdb5.1-dev libdb5.1++-dev libminiupnpc-dev).each do |pkg|
    package pkg do
        action :install
    end
end

unless File.exists? "/usr/bin/logosd"
  git "/tmp/logos" do
    repository "git://github.com/logos-project/logos.git"
    reference "fe7b87a9761d9819bc2dcb6796b46b17fa775a5c"
    action :sync
  end

  # Compiling logos takes more memory than an AWS t1.micro has (600)
  memory_total_mb = node['memory']['total'][0..-3].to_i / 1024 +
    node['memory']['swap']['total'][0..-3].to_i / 1024

  Chef::Log.warn "Memory total #{memory_total_mb}"

  #swap do
  #  mb 2048
  #  only_if memory_total_mb < 1000
  #end

  bash "install-logos" do
    cwd "/tmp/logos/src"
    code <<-EOH
    sudo make -f makefile.unix
    EOH
    timeout 360000
    not_if { File.exists? '/tmp/logos/src/logosd' }
  end

  bash "/usr/bin/logosd" do
    code 'mv -f /tmp/logos/src/logosd /usr/bin/logosd'
  end

  directory '/tmp/logos' do
    recursive true
    action :delete
  end
end

include_recipe "aws"
aws = Chef::EncryptedDataBagItem.load("aws", 'main')
bag = Chef::EncryptedDataBagItem.load("snow", 'main')
env_bag = bag[node.chef_environment]

directory "/lgs" do
  owner "ubuntu"
  group "ubuntu"
  mode 0775
  recursive true
end

if node[:cloud] && node[:cloud][:provider] == 'ec2'
    
    aws_device = "/dev/#{node[:snow][:logosd][:aws_device]}"
    os_device = "/dev/#{node[:snow][:logosd][:os_device]}"
    
    aws_ebs_volume aws_device do
        aws_access_key aws['aws_access_key_id']
        aws_secret_access_key aws['aws_secret_access_key']
        size node[:snow][:logosd][:volume_size]
        device aws_device
        action [ :create, :attach ]
    end
    
    execute "sudo mkfs.xfs #{os_device}" do
      only_if "xfs_admin -l #{os_device} 2>&1 | grep -qx 'xfs_admin: #{os_device} is not a valid XFS filesystem (unexpected SB magic number 0x00000000)'"
    end

    mount "/lgs" do
        fstype "xfs"
        device os_device
        action [:mount, :enable]
    end
end

# Ensure rights
directory "/lgs" do
  owner "ubuntu"
  group "ubuntu"
  mode 0775
end

template "/etc/init/logosd.conf" do
  source "logosd/service.erb"
  owner "root"
  group "root"
  mode 00644
  notifies :restart, "service[logosd]"
end

template "/lgs/logos.conf" do
  source "logosd/logos.conf.erb"
  variables({
    :username => env_bag['logos']['username'],
    :password => env_bag['logos']['password']
  })
  owner "ubuntu"
  group "ubuntu"
  mode 0664
end

service "logosd" do
  provider Chef::Provider::Service::Upstart
  supports :start => true
  action [:enable, :start]
end

#monit_monitrc "logosd" do
#end

# Automatic backups
include_recipe "cron"
include_recipe "snow::ebssnapshot"

#cron_d "ebs-snapshot" do
#  hour 14
#  minute 0
#  command "/usr/bin/ebs-snapshot.sh /lgs #{node[:snow][:logosd][:volume_id]}"
#end

diskmonit "lgs" do
    path "/lgs"
end
