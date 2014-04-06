
["python-qt4", "python-twisted", "python-psutil", "python-setuptools"].each do |pkg|
    package pkg do
        action :install
    end
end

easy_install_package "txJSON-RPC" do
  action :install
end

bag = Chef::EncryptedDataBagItem.load("snow", 'main')
snow_env_bag = bag[node.chef_environment]

armory_config = snow_env_bag['armory']

package = "armory_0.90-beta_12.04_amd64.deb"

remote_file "/tmp/#{package}" do
  source "https://s3.amazonaws.com/bitcoinarmory-releases/#{package}"
  mode 0644
  #checksum "" # PUT THE SHA256 CHECKSUM HERE
end

dpkg_package "armory" do
  source "/tmp/#{package}"
  action :install
end

template "/etc/init/armoryd.conf" do
  source "armory/service.erb"
  owner "root"
  group "root"
  mode 00644
  variables :snow_env_bag => snow_env_bag
end

directory "/btc/.armory" do
    owner "ubuntu"
    group "ubuntu"
end

file "/btc/.armory/armoryd.conf" do
  content "#{armory_config['username']}:#{armory_config['password']}"
  mode '640'
  owner "ubuntu"
  group "ubuntu"
  action :create
end

service "armoryd" do
  provider Chef::Provider::Service::Upstart
  supports :start => true
  action [:enable, :start]
end
