include_recipe "sudo"

user = Chef::EncryptedDataBagItem.load("users", 'ops')
user_name = user['id']
password  = user['password']
ssh_keys   = user['ssh_keys']
home      = "/home/#{user_name}"

# Create a User Ops
user user_name do
  home  home
  shell "/bin/bash"
  gid "sudo"
  supports :manage_home => true # Manage home directory
end

# Create .ssh directory
directory "#{home}/.ssh" do
  owner user_name
  group user_name
  mode 0700
end

ssh_keys_joined = ssh_keys.join("\n")

# create an authorized_keys file
authorized_keys_file ="#{home}/.ssh/authorized_keys"
file authorized_keys_file do
  owner user_name
  mode  0600
  content ssh_keys_joined
end

user "ubuntu" do
  supports :manage_home => true
  comment "ubuntu"
  gid "sudo"
  home "/home/ubuntu"
  shell "/bin/bash"
end

group "ubuntu" do
  members "ubuntu"
end