include_recipe "snow::common"

bag = Chef::EncryptedDataBagItem.load("snow", 'main')
env_bag = bag[node.chef_environment]

reverse_ip = "127.0.0.1"
if env_bag['reverse']
  reverse_ip = env_bag['reverse']['ip'] || "127.0.0.1"
end

include_recipe "iptables"
iptables_rule "iptables_router" do
 variables({:reverse_ip => reverse_ip})
end





