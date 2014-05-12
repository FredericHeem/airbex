define :workercrypto do

    include_recipe "snow::common"
    include_recipe "apt"
    include_recipe "nodejs"
    include_recipe "postgresql::client"
    
    cryptoName = params[:cryptoName]
    cryptoCode = params[:cryptoCode]
    workerDir = params[:workerDir]
    scale = params[:scale] || 8
    
    package 'git' do
    end
    
    include_recipe 'deploy_wrapper'
    bag = Chef::EncryptedDataBagItem.load("snow", 'main')
    env_bag = bag[node.chef_environment]
    
    p2p_port = env_bag[cryptoName]['p2p_port']
    if p2p_port
      include_recipe "iptables"
      iptables_rule "iptables_crypto_#{cryptoName}" do
         source "iptables_crypto.erb"
         variables({:p2p_port => p2p_port})
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
    
    services = %w(in out address)
    services.each do |service|
      template "/etc/init/snow-#{cryptoName}#{service}.conf" do
        source "workers/upstart/cryptoservice.conf.erb"
        owner "root"
        group "root"
        mode 00644
        variables({
            :serviceSuffix => service,
            :service => "snow-#{cryptoName}#{service}",
            :workerDir => workerDir
        })
        notifies :restart, "service[snow-#{cryptoName}#{service}]"
      end
    end
   
    services.each do |service|
      template "/usr/bin/snow-#{cryptoName}#{service}.sh" do
        source "workers/cryptoservice.sh.erb"
        owner "root"
        group "root"
        mode 0755
        variables({
            :cryptoName => cryptoName,
            :service => "snow-#{cryptoName}#{service}",
            :serviceSuffix => service,
            :workerDir => workerDir
        })
      end
    end    
    # Create services
    services.each do |service|
      service "snow-#{cryptoName}#{service}" do
        provider Chef::Provider::Service::Upstart
        supports :start => true, :stop => true, :restart => true
        action :enable
      end
    end
    
    # Deployment config
    deploy_revision workerDir do
        user "ubuntu"
        group "ubuntu"
        repo env_bag["repository"]["main"]["url"]
        branch env_bag["repository"]["main"]["branch"]
        ssh_wrapper "/home/ubuntu/workers-ssh-wrapper/workers_deploy_wrapper.sh"
        action :deploy
        before_symlink do
          bash "npm install" do
            user "root"
            group "root"
            cwd "#{release_path}/workers"
            code %{
              npm install
            }
          end
        end
        notifies :restart, "service[snow-#{cryptoName}in]"
        notifies :restart, "service[snow-#{cryptoName}out]"
        notifies :restart, "service[snow-#{cryptoName}address]"
        keep_releases 2
        symlinks({
             "config/workers.json" => "workers/config/config.#{node.chef_environment}.json"
        })
        symlink_before_migrate({})
        create_dirs_before_symlink(['workers', 'workers/config'])
        purge_before_symlink([])
    end
    
    # Application config
    directory "#{workerDir}/shared" do
      owner "ubuntu"
      group "ubuntu"
    end
    
    directory "#{workerDir}/shared/config" do
      owner "ubuntu"
      group "ubuntu"
    end
    
    role = "role:#{cryptoName}d"
    
    pgm_ip = env_bag['pgm']['ip'] || "127.0.0.1"
    pgs_ip = "127.0.0.1"
    if env_bag['pgs']
      pgs_ip = env_bag['pgs']['ip'] || "127.0.0.1"
    end
    cryptod_ip = env_bag[cryptoName]['ip'] || "127.0.0.1"
    
    template "#{workerDir}/shared/config/workers.json" do
        source 'workers/config-lgs.json.erb'
        variables({
            :website_url => env_bag['api']['website_url'],
            :pgm_ip => pgm_ip,
            :pgs_ip => pgs_ip,
            :cryptod_ip => cryptod_ip,
            :crypto => env_bag[cryptoName],
            :env_bag => env_bag,
            :currency => cryptoCode,
            :scale => scale
        })
        notifies :restart, resources(:service => "snow-#{cryptoName}in")
        notifies :restart, resources(:service => "snow-#{cryptoName}out")
        notifies :restart, resources(:service => "snow-#{cryptoName}address")
    end
 
    services.each do |service|
        template "/etc/monit/conf.d/snow-#{cryptoName}#{service}.monitrc" do
          source "crypto-workers.monitrc.erb"
          variables({
            :service => "snow-#{cryptoName}#{service}"
          })
          owner "ubuntu"
          group "ubuntu"
          mode 0664
        end
    end
end
