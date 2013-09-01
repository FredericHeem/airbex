bag = data_bag_item("snow", "main")
env_bag = bag[node.chef_environment]

node.default['monit']['alert_email'] = env_bag['monit']['alert_email']

node.default['snow']['pgm']['volume_id'] = env_bag['pgm']['volume_id']
node.default['snow']['admin']['domain'] = env_bag['domain']
node.default['snow']['frontend']['domain'] = env_bag['domain']
node.default['snow']['landing']['domain'] = env_bag['domain']
node.default['snow']['reverse']['server_name'] = env_bag['domain']

node.default['snow']['bitcoind']['volume_id'] = env_bag['bitcoind']['volume_id']
node.default['snow']['litecoind']['volume_id'] = env_bag['litecoind']['volume_id']

node.default['snow']['repo'] = "git@github.com:justcoin/justcoin.git"
