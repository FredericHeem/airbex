package 'git' do
end

include_recipe 'deploy_wrapper'

bag = data_bag_item("snow", "main")
env_bag = bag[node.chef_environment]
node['monit']['alert_email'] = env_bag['monit']['alert_email']

ssh_known_hosts_entry 'github.com'

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
    repo node[:snow][:repo]
    ssh_wrapper "/home/ubuntu/api-ssh-wrapper/api_deploy_wrapper.sh"
    action :deploy
    branch 'master'
    restart 'sudo initctl restart snow-api || sudo initctl start snow-api'
    keep_releases 10
    symlinks({
         "config/api.json" => "api/config/#{node.chef_environment}.json"
    })
    symlink_before_migrate({})
    create_dirs_before_symlink(['api', 'api/config'])
    purge_before_symlink([])
end

# Application config
directory "#{node[:snow][:api][:app_directory]}/shared/config" do
  owner "ubuntu"
  group "ubuntu"
end

pgm_ip = search(:node, 'role:pgm').first ? search(:node, 'role:pgm').first[:ipaddress] : nil
pgs_ip = search(:node, 'role:pgs').first ? search(:node, 'role:pgs').first[:ipaddress] : nil

template "#{node[:snow][:api][:app_directory]}/shared/config/api.json" do
    source 'api/api.json.erb'
    variables({
        :pgm_conn => "postgres://postgres@#{pgm_ip || '127.0.0.1'}/snow",
        :pgs_conn => "postgres://postgres@#{pgs_ip || '127.0.0.1'}/snow",
        :smtp => env_bag['api']['smtp'],
        :intercom => env_bag['api']['intercom'],
        :bde => env_bag['api']['bde'],
        :tropo => env_bag['api']['tropo'],
        :email_from => env_bag['api']['email_from'],
        :ripple => env_bag['ripple'],
        :website_url => env_bag['api']['website_url'],
    })
    notifies :restart, resources(:service => "snow-api")
end

monit_monitrc "snow-api" do
end
