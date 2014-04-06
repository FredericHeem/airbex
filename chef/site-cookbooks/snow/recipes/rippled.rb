include_recipe "snow::common"

%w(pkg-config git scons protobuf-compiler libboost1.48-all-dev exuberant-ctags libprotobuf-dev).each do |pkg|
    package pkg do
        action :install
    end
end

swap do
    mb 2048
end

include_recipe 'deploy_wrapper'

bag = Chef::EncryptedDataBagItem.load("snow", 'main')
#bag = data_bag_item("snow", "main")
env_bag = bag[node.chef_environment]

ssh_known_hosts_entry 'github.com'

deploy_wrapper 'rippled' do
    ssh_wrapper_dir '/home/ubuntu/rippled-ssh-wrapper'
    ssh_key_dir '/home/ubuntu/.ssh'
    ssh_key_data bag["github_private_key"]
    owner "ubuntu"
    group "ubuntu"
    sloppy true
end

directory "/home/ubuntu/rippled" do
  owner "ubuntu"
  group "ubuntu"
end

directory "/home/ubuntu/rippled/shared" do
  owner "ubuntu"
  group "ubuntu"
end

template "/home/ubuntu/rippled/shared/rippled.cfg" do
  source "rippled/rippled.cfg.erb"
  owner "ubuntu"
  group "ubuntu"
  mode 0664
  notifies :restart, "service[rippled]"
end

deploy_revision "/home/ubuntu/rippled" do
  user "ubuntu"
  group "ubuntu"
  repo "git@github.com:ripple/rippled.git"
  ssh_wrapper "/home/ubuntu/rippled-ssh-wrapper/rippled_deploy_wrapper.sh"
  action :deploy
  branch 'master'
  keep_releases 1

  symlinks({
       "rippled.cfg" => "rippled/rippled.cfg"
  })

  before_symlink do
    bash "make" do
      user "ubuntu"
      group "ubuntu"
      cwd "#{release_path}"
      code "scons"
    end
  end

  symlink_before_migrate({})
  create_dirs_before_symlink(['rippled'])
  purge_before_symlink([])
end

template "/etc/init/rippled.conf" do
  source "rippled/service.erb"
  owner "root"
  group "root"
  mode 00644
  notifies :restart, "service[rippled]"
end

service "rippled" do
  provider Chef::Provider::Service::Upstart
  supports :start => true
  action [:enable, :start]
end
