bag = Chef::EncryptedDataBagItem.load("snow", 'main')
env_bag = bag[node.chef_environment]

if env_bag['ga']
    include_recipe "openssh"
    
    package 'libpam-google-authenticator' do
    end
    
    node.override["openssh"]["server"]["challenge_response_authentication"] = "yes"
    node.override["openssh"]["server"]["authentication_methods"] = "publickey,keyboard-interactive"
    
    user = env_bag['users']['ops']
    user_name = user['id']
    home      = "/home/#{user_name}"
    
    ga_file ="#{home}/.google_authenticator"
    file ga_file do
      owner user_name
      mode  0600
      content env_bag['ga']
    end
    
    template "/etc/pam.d/sshd" do
        source "pam-sshd.erb"
        owner "root"
        group "root"
        mode 0755
    end
end