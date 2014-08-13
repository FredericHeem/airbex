define :insight do

    include_recipe "snow::common"
    include_recipe "apt"
    include_recipe "nodejs"
    include_recipe "nginx"
    
    cryptoName = params[:cryptoName]
    cryptoCode = params[:cryptoCode]
    insightApiDir = params[:insightApiDir]
    insightDir = params[:insightDir]
     
    package 'git' do
    end
    
    include_recipe 'deploy_wrapper'
    bag = Chef::EncryptedDataBagItem.load("snow", 'main')
    env_bag = bag[node.chef_environment]
    
    port = env_bag[cryptoName]['insight_port']
    if port
      include_recipe "iptables"
      iptables_rule "iptables_insight_#{cryptoName}" do
         source "iptables_insight.erb"
         variables({:crypto => env_bag[cryptoName]})
      end
    end 
    
    ssh_known_hosts_entry 'github.com'
    
    deploy_wrapper 'workers' do
        ssh_wrapper_dir '/home/ubuntu/workers-ssh-wrapper'
        ssh_key_dir '/home/ubuntu/.ssh'
        ssh_key_data bag["github_private_key"]
        owner "ubuntu"
        group "ubuntu"
        sloppy true
    end
    

  service = "insight-#{cryptoName}"
  template "/etc/init/#{service}.conf" do
    source "insight/upstart/insightservice.conf.erb"
    owner "root"
    group "root"
    mode 00644
    variables({
        :service => service,
    })
    notifies :restart, "service[#{service}]"
  end
   

  template "/usr/bin/#{service}.sh" do
    source "insight/insightservice.sh.erb"
    owner "root"
    group "root"
    mode 0755
    variables({
        :crypto => env_bag[cryptoName],
        :cryptoName => cryptoName,
        :insightApiDir => insightApiDir,
        :insightDir => insightDir,
        :currency => cryptoCode
    })
  end

    service "#{service}" do
      provider Chef::Provider::Service::Upstart
      supports :start => true, :stop => true, :restart => true
      action :enable
    end

    # Deployment config
    deploy_revision "#{insightApiDir}" do
        user "ubuntu"
        group "ubuntu"
        repo env_bag["repository"]["insight-api"]["url"]
        branch env_bag["repository"]["insight-api"]["branch"]
        ssh_wrapper "/home/ubuntu/workers-ssh-wrapper/insight_deploy_wrapper.sh"
        action :deploy
        before_symlink do
          bash "npm install" do
            user "root"
            group "root"
            cwd "#{release_path}/"
            code %{
              npm install
            }
          end
        end
        notifies :restart, "service[#{service}]"
        keep_releases 2
        symlink_before_migrate({})
        purge_before_symlink([])
    end
    
    deploy_revision "#{insightDir}" do
        user "ubuntu"
        group "ubuntu"
        repo env_bag["repository"]["insight"]["url"]
        branch env_bag["repository"]["insight"]["branch"]
        ssh_wrapper "/home/ubuntu/workers-ssh-wrapper/insight_deploy_wrapper.sh"
        action :deploy
        before_symlink do
          bash "npm install" do
            user "root"
            group "root"
            cwd "#{release_path}/"
            code %{
              npm install
              ./node_modules/bower/bin/bower --allow-root install
              OPERATOR="airbex-#{cryptoName}" ./node_modules/grunt-cli/bin/grunt compile
            }
          end
        end
        notifies :restart, "service[#{service}]"
        keep_releases 2
        symlink_before_migrate({})
        purge_before_symlink([])
    end
    
    template "/etc/nginx/sites-available/#{service}" do
      source "insight/nginx.conf.erb"
      owner "root"
      group "root"
      notifies :reload, "service[nginx]"
      variables({
        :service => service,
        :insightDir => insightDir,
        :insightPort => env_bag[cryptoName]['insight_port']
      })
      notifies :reload, resources(:service => "nginx")
    end
    
    nginx_site service do
        action :enable
    end
    
    template "/etc/monit/conf.d/#{service}.monitrc" do
      source "insightmonitrc.erb"
      variables({
        :insightName => service,
        :insight_port => env_bag[cryptoName]['insight_port'],
        :insight_api_port => env_bag[cryptoName]['insight_port']
      })
      owner "ubuntu"
      group "ubuntu"
      mode 0664
    end
end
