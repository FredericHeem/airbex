define :compilecrypto do

    include_recipe "apt"
    include_recipe "snow::common"
    include_recipe 'deploy_wrapper'

    bag = Chef::EncryptedDataBagItem.load("snow", 'main')
    env_bag = bag[node.chef_environment]

    cryptoName = params[:cryptoName]
    deamonName = params[:deamonName]
    cryptoCode = params[:cryptoCode]
    gitRepo = params[:gitRepo]
    gitRef = params[:gitRef]

    apt_repository "bitcoin" do
      uri "http://ppa.launchpad.net/bitcoin/bitcoin/ubuntu"
      distribution node[:lsb][:codename]
      components ["main"]
      keyserver "pgp.mit.edu"
      key "C300EE8C"
    end
    
    %w(build-essential libtool automake libssl-dev libboost-all-dev git libdb5.1-dev libdb5.1++-dev pkg-config libminiupnpc-dev).each do |pkg|
        package pkg do
            action :install
            options "--force-yes"
        end
    end
    
    ssh_known_hosts_entry 'github.com'

    deploy_wrapper 'compilecrypto' do
        ssh_wrapper_dir '/home/ubuntu/compilecrypto-ssh-wrapper'
        ssh_key_dir '/home/ubuntu/.ssh'
        ssh_key_data bag["github_private_key"]
        owner "ubuntu"
        group "ubuntu"
        sloppy true
    end

    unless File.exists? "/usr/bin/#{deamonName}"
      git "/tmp/#{cryptoName}" do
        repository gitRepo
        reference gitRef
        action :sync
        ssh_wrapper "/home/ubuntu/compilecrypto-ssh-wrapper/compilecrypto_deploy_wrapper.sh"
      end
    
      # Compiling  takes more memory than an AWS t1.micro has (600)
      memory_total_mb = node['memory']['total'][0..-3].to_i / 1024 +
        node['memory']['swap']['total'][0..-3].to_i / 1024
    
      Chef::Log.warn "Memory total #{memory_total_mb}"
    
      #swap do
      #  mb 2048
      #  only_if memory_total_mb < 1000
      #end
    
      bash "install-#{cryptoName}" do
        cwd "/tmp/#{cryptoName}/"
        code <<-EOH
        #{params[:compileCommand]}
        EOH
        timeout 360000
        not_if { File.exists? "/usr/bin/#{deamonName}" }
      end
    
      bash "/usr/bin/#{deamonName}" do
        code "cp /tmp/#{cryptoName}/src/#{deamonName} /usr/bin/#{deamonName}"
      end
    
      #directory '/tmp/litecoin' do
      #  recursive true
      #  action :delete
      #end
    end
    
    include_recipe "aws"
    aws = Chef::EncryptedDataBagItem.load("aws", 'main')
    bag = Chef::EncryptedDataBagItem.load("snow", 'main')
    env_bag = bag[node.chef_environment]
    
    directory "/#{cryptoCode}" do
      owner "ubuntu"
      group "ubuntu"
      mode 0775
      recursive true
    end
    
    if node[:cloud] && node[:cloud][:provider] == 'ec2'
        
        aws_device = "/dev/#{node[:snow]["#{deamonName}"][:aws_device]}"
        os_device = "/dev/#{node[:snow]["#{deamonName}"][:os_device]}"
        
        volume_size = 10
        if node[:snow]["#{deamonName}"]
            volume_size = node[:snow]["#{deamonName}"][:volume_size]
        end
        aws_ebs_volume aws_device do
            aws_access_key aws['aws_access_key_id']
            aws_secret_access_key aws['aws_secret_access_key']
            size volume_size
            device aws_device
            action [ :create, :attach ]
        end
        
        execute "sudo mkfs.xfs #{os_device}" do
          only_if "xfs_admin -l #{os_device} 2>&1 | grep -qx 'xfs_admin: #{os_device} is not a valid XFS filesystem (unexpected SB magic number 0x00000000)'"
        end
    
        mount "/#{cryptoCode}" do
            fstype "xfs"
            device os_device
            action [:mount, :enable]
        end
        
        include_recipe "snow::ebssnapshot"
        #cron_d "ebs-snapshot" do
        #  hour 14
        #  minute 0
        #  command "/usr/bin/ebs-snapshot.sh /#{cryptoCode} #{node[:snow][:#{deamonName}][:volume_id]}"
        #end
    
    end
    
    # Ensure rights
    directory "/#{cryptoCode}" do
      owner "ubuntu"
      group "ubuntu"
      mode 0775
    end
    
    template "/etc/init/#{deamonName}.conf" do
      source "cryptoservice.erb"
      variables({
        :deamonName => deamonName,
        :cryptoCode => cryptoCode
      })
      owner "root"
      group "root"
      mode 00644
      notifies :restart, "service[#{deamonName}]"
    end
    
    cryptoConfig = env_bag["#{cryptoName}"]
    
    template "/#{cryptoCode}/#{cryptoName}.conf" do
      source "crypto.conf.erb"
      variables({
        :username => cryptoConfig['username'],
        :password => cryptoConfig['password'],
        :rpcallowip => cryptoConfig['rpcallowip'] || 'localhost' ,
        :testnet => cryptoConfig['testnet'] || 0,
        :nodes => cryptoConfig['nodes'] || []
      })
      owner "ubuntu"
      group "ubuntu"
      mode 0600
    end
    
    service "#{deamonName}" do
      provider Chef::Provider::Service::Upstart
      supports :start => true
      action [:enable, :start]
    end
    
    template "/etc/monit/conf.d/#{deamonName}.monitrc" do
      source "cryptomonitrc.erb"
      variables({
        :deamonName => deamonName,
        :port => cryptoConfig['port']
      })
      owner "ubuntu"
      group "ubuntu"
      mode 0664
      notifies :restart, "service[monit]"
    end
    
    # Automatic backups
    include_recipe "cron"
    
    diskmonit "#{cryptoCode}" do
        path "/#{cryptoCode}"
    end

end
