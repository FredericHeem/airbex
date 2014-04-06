include_recipe "hostname"
include_recipe "snow::crontp"
include_recipe "snow::aptupdate"
include_recipe "logrotate"
include_recipe "postfix"
include_recipe "monit"

bag = Chef::EncryptedDataBagItem.load("snow", 'main')
env_bag = bag[node.chef_environment]

Chef::Application.fatal!("env_bag for #{node.chef_environment} is null") if env_bag.nil?

node.default['monit']['alert_email'] = env_bag['monit']['alert_email']

node.default['snow']['pgm']['volume_id'] = env_bag['pgm']['volume_id']
node.default['snow']['admin']['domain'] = env_bag['domain']
node.default['snow']['frontend']['domain'] = env_bag['domain']
node.default['snow']['landing']['domain'] = env_bag['domain']
node.default['snow']['reverse']['server_name'] = env_bag['domain']

node.default['snow']['bitcoind']['volume_size'] = 40
node.default['snow']['litecoind']['volume_size'] = 20
node.default['snow']['dogecoind']['volume_size'] = 20

#node.default['snow']['bitcoind']['volume_id'] = env_bag['bitcoind']['volume_id']
#node.default['snow']['litecoind']['volume_id'] = env_bag['litecoind']['volume_id']

node.default['raven']['app'] = env_bag['raven']['app']
node.default['raven']['uri'] = env_bag['raven']['uri']

node.default['pg_write_url']['password'] = env_bag['pg_write_url']['password']
node.default['pg_read_url']['password'] = env_bag['pg_read_url']['password']

logrotate_app "snow" do
  cookbook "logrotate"
  path [
    "/var/log/snow*.log"
  ]
  options ["missingok", "copytruncate", "compress", "notifempty"]
  frequency "daily"
  rotate 7
  create "664 root root"
end


#TODO add a recipe to create the user ubuntu
template '/home/ubuntu/.vimrc' do
  source "vimrc.erb"
  owner "ubuntu"
end

diskmonit "rootfs" do
end
