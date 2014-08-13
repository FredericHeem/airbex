include_recipe "apt"
include_recipe "snow::common"
include_recipe "nginx"

bag = Chef::EncryptedDataBagItem.load("snow", 'main')
env_bag = bag[node.chef_environment]

#hostentry do
#  roles ["admin", "frontend", "api", "landing"]
#end

api_ip = env_bag['api']['ip'] || "127.0.0.1"
admin_ip = "127.0.0.1"
landing_ip = "127.0.0.1"
reverse_ip = "127.0.0.1"
frontend_ip = "127.0.0.1"

Chef::Log.info("frontend has IP address #{frontend_ip}")
Chef::Log.info("api has IP address #{api_ip}")
Chef::Log.info("landing has IP address #{landing_ip}")
Chef::Log.info("admin has IP address #{admin_ip}")

directory "/etc/nginx/conf/" do
  owner "www-data"
  group "root"
  mode 00600
  action :create
end

if env_bag['https']
    cookbook_file "/etc/nginx/conf/certificate.crt" do
      source "#{env_bag['https']['certificate']}"
      owner "www-data"
    end
    
    file "/etc/nginx/conf/private-key.pem" do
      content env_bag['https']['private_key']
      owner "www-data"
      group "root"
      mode 00640
    end
end 

include_recipe "nginx"

# Nginx configuration
template '/etc/nginx/sites-available/snow-reverse' do
  source "reverse/nginx.conf.erb"
  owner "root"
  group "root"
  notifies :reload, "service[nginx]"
  variables({
    :admin_ip => admin_ip || '127.0.0.1',
    :frontend_ip => frontend_ip || '127.0.0.1',
    :landing_ip => landing_ip || '127.0.0.1',
    :api_ip => api_ip || '127.0.0.1',
    :https => env_bag['https'],
    :env => env_bag
  })
  notifies :reload, resources(:service => "nginx")
end

# Enable site
nginx_site 'snow-reverse' do
  action :enable
end

include_recipe "iptables"

iptables_rule "all_http"
iptables_rule "all_https"

iptables_rule "iptables_reverse" do
 variables({
   :api_ip => api_ip,
   :env => env_bag
 })
end
