include_recipe "apt"

bag = Chef::EncryptedDataBagItem.load("snow", 'main')

include_recipe "iptables"
iptables_rule "iptables_chef_server" do
 variables({:chef_server_ip => bag['chef_server_ip']})
end


