define :workercrypto do

    include_recipe "snow::common"
    include_recipe "apt"
    include_recipe "nodejs"
    include_recipe "postgresql::client"
    
    cryptoName = params[:cryptoName]
    cryptoCode = params[:cryptoCode]
    workerDir = params[:workerDir]
    minConf = params[:minConf]
    
    package 'git' do
    end
    
    include_recipe 'deploy_wrapper'
    bag = Chef::EncryptedDataBagItem.load("snow", 'main')
    env_bag = bag[node.chef_environment]
    
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
        branch node[:snow][:branch]
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
    
    cryptod_node = search(:node, "#{role} AND chef_environment:#{node.chef_environment}").first
    cryptod_ip = NetworkUtils.get_private_ipv4_for_node(cryptod_node)
    
    pgm_node = search(:node, "role:pgm AND chef_environment:#{node.chef_environment}").first
    pgm_ip = NetworkUtils.get_private_ipv4_for_node(pgm_node)
    
    pgs_node = search(:node, "role:pgs AND chef_environment:#{node.chef_environment}").first
    pgs_ip = NetworkUtils.get_private_ipv4_for_node(pgs_node)

    if pgm_ip == cryptod_ip
      pgm_ip = "127.0.0.1"
    end
    
    if pgs_ip == cryptod_ip
      pgs_ip = "127.0.0.1"
    end    
    
    template "#{workerDir}/shared/config/workers.json" do
        source 'workers/config-lgs.json.erb'
        variables({
            :website_url => env_bag['api']['website_url'],
            :pgm_ip => pgm_ip || '127.0.0.1',
            :pgs_ip => pgs_ip || '127.0.0.1',
            :cryptod_ip => '127.0.0.1',
            :crypto => env_bag[cryptoName],
            :env_bag => env_bag,
            :currency => cryptoCode,
            :minConf => minConf
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
