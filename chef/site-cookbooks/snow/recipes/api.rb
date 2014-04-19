include_recipe "snow::common"
include_recipe "apt"
include_recipe "nodejs"
include_recipe "postgresql::client"

package 'git' do
end

include_recipe 'deploy_wrapper'

bag = Chef::EncryptedDataBagItem.load("snow", 'main')
env_bag = bag[node.chef_environment]

ssh_known_hosts_entry 'github.com'

snow_api_dir = node[:snow][:api][:app_directory]

deploy_wrapper 'api' do
    ssh_wrapper_dir '/home/ubuntu/api-ssh-wrapper'
    ssh_key_dir '/home/ubuntu/.ssh'
    ssh_key_data bag["github_private_key"]
    owner "ubuntu"
    group "ubuntu"
    sloppy true
end

# Register API upstart service
template "/etc/init/snow-api.conf" do
  source "api/service.erb"
  owner "root"
  group "root"
  mode 00644
end

service "snow-api" do
  provider Chef::Provider::Service::Upstart
  supports :start => true, :stop => true, :restart => true
  action [:enable]
end

# Deployment config
deploy_revision node[:snow][:api][:app_directory] do
    user "ubuntu"
    group "ubuntu"
    repo env_bag["repository"]["main"]["url"]
    branch env_bag["repository"]["main"]["branch"]
    ssh_wrapper "/home/ubuntu/api-ssh-wrapper/api_deploy_wrapper.sh"
    action :deploy
    branch node[:snow][:branch]
    notifies :restart, "service[snow-api]"
    keep_releases 2
    symlinks({
         "config/api.json" => "api/config/#{node.chef_environment}.json"
    })
    before_symlink do
      bash "npm install" do
        user "root"
        group "root"
        cwd "#{release_path}/api"
        code %{
          npm install
        }
      end
    end
    symlink_before_migrate({})
    create_dirs_before_symlink(['api', 'api/config'])
    purge_before_symlink([])
end


# Application config
directory "#{node[:snow][:api][:app_directory]}/shared" do
  owner "ubuntu"
  group "ubuntu"
end

directory "#{node[:snow][:api][:app_directory]}/shared/config" do
  owner "ubuntu"
  group "ubuntu"
end

api_ip = NetworkUtils.get_private_ipv4_for_node(search(:node, 'role:api').first)
pgm_ip = NetworkUtils.get_private_ipv4_for_node(search(:node, 'role:pgm').first)
pgs_ip = NetworkUtils.get_private_ipv4_for_node(search(:node, 'role:pgs').first)
redis_ip = "127.0.0.1"

if pgm_ip == api_ip
  pgm_ip = "127.0.0.1"
end
    
execute "pg-migrate-install" do
    user "root"
    cwd node[:snow][:api][:app_directory] + '/current/db'
    command "npm install -g pg-test pg-migrate"
    action :run
end

execute "pg-migrate" do
    user "ubuntu"
    cwd node[:snow][:api][:app_directory] + '/current/db/migrations'
    command "pg-migrate -u postgres://postgres:" + env_bag['pg_password'] + "@localhost/snow"
    action :run
end

db_migration = node[:snow][:api][:app_directory] + '/current/db/' + bag['db_migration']
execute "pg-migrate-custom" do
    user "ubuntu"
    cwd db_migration
    command "pg-migrate -u postgres://postgres:" + env_bag['pg_password'] + "@localhost/snow"
    action :run
    only_if { ::File.directory?(db_migration) }
end

template "#{node[:snow][:api][:app_directory]}/shared/config/api.json" do
    source 'api/api.json.erb'
    variables({
        :pgm_ip => pgm_ip || '127.0.0.1',
        :pgs_ip => pgs_ip || '127.0.0.1',
        :redis_ip => redis_ip,
        :api_ip => api_ip,
        :smtp => env_bag['api']['smtp'],
        :intercom => env_bag['api']['intercom'],
        :bde => env_bag['api']['bde'],
        :twilio => env_bag['api']['twilio'],
        :email_from => env_bag['api']['email_from'],
        :ripple => env_bag['ripple'],
        :website_url => env_bag['api']['website_url'],
        :segment => env_bag['segment'],
        :company => env_bag['company'],
        :email_support => env_bag['email_support'],
        :signature => env_bag['signature']
        
    })
    notifies :restart, resources(:service => "snow-api")
end


monit_monitrc "snow-api" do
end
