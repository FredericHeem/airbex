include_recipe "snow::common"

bag = Chef::EncryptedDataBagItem.load("snow", 'main')
env_bag = bag[node.chef_environment]

package 'ipset' do
end

reverse_ip = "127.0.0.1"
if env_bag['reverse']
  reverse_ip = env_bag['reverse']['ip'] || "127.0.0.1"
end

include_recipe "iptables"
iptables_rule "iptables_router" do
 variables({:reverse_ip => reverse_ip})
end

template "/etc/iptables.snat" do
  source "router/nat.conf.erb"
  owner  "root"
  group  "root"
  mode   "0644"
  notifies :run, resources(:execute => "rebuild-iptables")
end

template "/etc/sysctl.conf" do
    source "router/sysctl.conf.erb"
    owner "root"
    group "root"
    mode 0755
end

template "/usr/bin/iptables_tor.sh" do
    source "iptables_tor.sh.erb"
    owner "root"
    group "root"
    mode 0755
end

cron_d "iptables-tor" do
  minute  0
  command '/usr/bin/iptables_tor.sh'
  user "root"
end






