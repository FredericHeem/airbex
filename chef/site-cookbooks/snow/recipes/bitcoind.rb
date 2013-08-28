["build-essential", "libssl-dev", "libboost-all-dev"].each do |pkg|
    package pkg do
        action :install
    end
end

include_recipe "aws"
aws = data_bag_item("aws", "main")

directory "/btc" do
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
    volume_id node[:snow][:bitcoind][:volume_id]
    device "/dev/sdf"
    action :attach
end

mount "/btc" do
    fstype "xfs"
    device "/dev/xvdf"
    action [:mount, :enable]
end

apt_repository "bitcoin" do
  uri "http://ppa.launchpad.net/bitcoin/bitcoin/ubuntu"
  distribution node[:lsb][:codename]
  components ["main"]
  keyserver "pgp.mit.edu"
  key "C300EE8C"
end

execute 'apt-get bitcoind' do
   command 'apt-get -q -y --force-yes install bitcoind=0.8.3-precise1'
   creates "/usr/bin/bitcoind"
end

template "/etc/init/bitcoind.conf" do
  source "bitcoind/service.erb"
  owner "root"
  group "root"
  mode 00644
end

template "/btc/bitcoin.conf" do
  source "bitcoind/bitcoin.conf.erb"
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
