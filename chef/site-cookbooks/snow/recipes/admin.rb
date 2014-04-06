include_recipe "snow::common"
include_recipe "nginx"
include_recipe "nodejs"
include_recipe "nginx"
include_recipe "solo-search"

['git', 'make', 'g++'].each do |pkg|
  package pkg do
  end
end

# Nginx configuration
api_ip = search(:node, 'role:api').first ? search(:node, 'role:api').first[:ipaddress] : nil

template '/etc/nginx/sites-available/snow-admin' do
  source "admin/nginx.conf.erb"
  owner "root"
  group "root"
  notifies :reload, "service[nginx]"
  variables({
    :api_ip => api_ip || '127.0.0.1'
  })
end

# include_recipe 'deploy_wrapper'
bag = Chef::EncryptedDataBagItem.load("snow", 'main')
env_bag = bag[node.chef_environment]

ssh_known_hosts_entry 'github.com'

deploy_wrapper 'admin' do
    ssh_wrapper_dir '/home/ubuntu/admin-ssh-wrapper'
    ssh_key_dir '/home/ubuntu/.ssh'
    ssh_key_data bag["github_private_key"]
    owner "ubuntu"
    group "ubuntu"
    sloppy true
end

# Deployment config
deploy_revision node[:snow][:admin][:app_directory] do
    user "ubuntu"
    group "ubuntu"
    repo env_bag["repository"]["main"]
    branch node[:snow][:branch]
    ssh_wrapper "/home/ubuntu/admin-ssh-wrapper/admin_deploy_wrapper.sh"
    action :deploy
    before_symlink do
      bash "npm install" do
        user "root"
        group "root"
        cwd "#{release_path}/admin"
        code %{
          npm install
          PATH=$PATH:./node_modules/.bin
          grunt production
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
nginx_site 'snow-admin' do
  action :enable
end
