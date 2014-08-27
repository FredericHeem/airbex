include_recipe "snow::common"
include_recipe "apt"
include_recipe "nginx"
include_recipe "nodejs"
include_recipe "solo-search"

['git'].each do |pkg|
  package pkg do
  end
end

# Nginx configuration
template '/etc/nginx/sites-available/snow-frontend' do
  source "frontend/nginx.conf.erb"
  owner "root"
  group "root"
  notifies :reload, "service[nginx]"
end

include_recipe 'deploy_wrapper'

bag = Chef::EncryptedDataBagItem.load("snow", 'main')
env_bag = bag[node.chef_environment]

ssh_known_hosts_entry 'gitlab.com'

deploy_wrapper 'frontend' do
    ssh_wrapper_dir '/home/ubuntu/frontend-ssh-wrapper'
    ssh_key_dir '/home/ubuntu/.ssh'
    ssh_key_data bag["github_private_key"]
    owner "ubuntu"
    group "ubuntu"
    sloppy true
end

operator = bag["operator"]

# Deployment config
deploy_revision node[:snow][:frontend][:app_directory] do
    user "ubuntu"
    group "ubuntu"
    repo env_bag["repository"]["front"]["url"]
    branch env_bag["repository"]["front"]["branch"]
    ssh_wrapper "/home/ubuntu/frontend-ssh-wrapper/frontend_deploy_wrapper.sh"
    action :deploy
    before_symlink do
      bash "npm install" do
        user "root"
        group "root"
        cwd "#{release_path}/frontend"
        code %{
          npm install --production
          PATH=$PATH:./node_modules/.bin
          SNOW_OPERATOR=#{operator} NODE_ENV=#{node.chef_environment} grunt production
        }
      end
    end    
    keep_releases 2
    symlinks({})
    symlink_before_migrate({})
    create_dirs_before_symlink([])
    purge_before_symlink([])

end

# Enable site
nginx_site 'snow-frontend' do
  action :enable
end
