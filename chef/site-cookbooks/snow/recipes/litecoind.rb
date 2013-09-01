%w(build-essential libssl-dev libboost-all-dev git libdb5.1-dev libdb5.1++-dev libminiupnpc-dev).each do |pkg|
    package pkg do
        action :install
    end
end

if File.exists? "/usr/bin/litecoind"
  swap do
    size 0
  end
else
  git "/tmp/litecoin" do
    repository "git://github.com/litecoin-project/litecoin.git"
    reference "4be9f4d40ea4bd40cf1c99649f1d613a28bb33e1"
    action :sync
  end

  # Compiling litecoin takes more memory than an AWS t1.micro has (600)
  memory_total_mb = node['memory']['total'][0..-3].to_i / 1024 +
    node['memory']['swap']['total'][0..-3].to_i / 1024

  swap do
    size 2048
    only_if memory_total_mb < 2000
  end

  bash "install-litecoin" do
    cwd "/tmp/litecoin/src"
    code <<-EOH
    sudo make -j4 -f makefile.unix
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
aws = data_bag_item("aws", "main")

directory "/ltc" do
  owner "ubuntu"
  group "ubuntu"
  mode 0775
  recursive true
end

# Disk is attached to /dev/sdf but shows up
# in ubuntu as /dev/xvdf
aws_ebs_volume "/dev/sdf" do
  aws_access_key aws['aws_access_key_id']
  aws_secret_access_key aws['aws_secret_access_key']
  volume_id node[:snow][:litecoind][:volume_id]
  device "/dev/sdf"
  action :attach
end

mount "/ltc" do
  fstype "xfs"
  device "/dev/xvdf"
  action [:mount, :enable]
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
  owner "ubuntu"
  group "ubuntu"
  mode 0664
end

service "litecoind" do
  provider Chef::Provider::Service::Upstart
  supports :start => true
  action [:enable, :start]
end

monit_monitrc "litecoind" do
end
