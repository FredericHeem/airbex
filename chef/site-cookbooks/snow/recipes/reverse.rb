include_recipe "apt"
include_recipe "snow::common"


bag = Chef::EncryptedDataBagItem.load("snow", 'main')
env_bag = bag[node.chef_environment]

hostentry do
  roles ["admin", "frontend", "api", "landing"]
end

reverse_node = search(:node, "role:reverse AND chef_environment:#{node.chef_environment}").first
reverse_ip = NetworkUtils.get_private_ipv4_for_node(reverse_node)

frontend_node = search(:node, "role:frontend AND chef_environment:#{node.chef_environment}").first
frontend_ip = NetworkUtils.get_private_ipv4_for_node(frontend_node)

admin_node = search(:node, "role:admin AND chef_environment:#{node.chef_environment}").first
admin_ip = NetworkUtils.get_private_ipv4_for_node(admin_node)

api_node = search(:node, "role:api AND chef_environment:#{node.chef_environment}").first
api_ip = NetworkUtils.get_private_ipv4_for_node(api_node)

landing_node = search(:node, "role:landing AND chef_environment:#{node.chef_environment}").first
landing_ip  = NetworkUtils.get_private_ipv4_for_node(landing_node)

if frontend_ip == reverse_ip
  frontend_ip = "127.0.0.1"
end

if admin_ip == reverse_ip
  admin_ip= "127.0.0.1"
end

if landing_ip == reverse_ip
  landing_ip = "127.0.0.1"
end

if api_ip == reverse_ip
  api_ip = "127.0.0.1"
end

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
    :https => env_bag['https']
  })
  notifies :reload, resources(:service => "nginx")
end

# Enable site
nginx_site 'snow-reverse' do
  action :enable
end
