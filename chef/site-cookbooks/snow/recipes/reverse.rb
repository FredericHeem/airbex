include_recipe "apt"
include_recipe "snow::common"
include_recipe "nginx"

bag = Chef::EncryptedDataBagItem.load("snow", 'main')
env_bag = bag[node.chef_environment]

frontend_ip = search(:node, 'role:frontend').first ? search(:node, 'role:frontend').first[:ipaddress] : nil
admin_ip = search(:node, 'role:admin').first ? search(:node, 'role:admin').first[:ipaddress] : nil
api_ip = search(:node, 'role:api').first ? search(:node, 'role:api').first[:ipaddress] : nil
frontend_ip = search(:node, 'role:frontend').first ? search(:node, 'role:frontend').first[:ipaddress] : nil
landing_ip = frontend_ip
  
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
    :api_ip => api_ip || '127.0.0.1'
  })
  notifies :reload, resources(:service => "nginx")
end

# Enable site
nginx_site 'snow-reverse' do
  action :enable
end
