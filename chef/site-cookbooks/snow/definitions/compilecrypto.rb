define :compilecrypto do

    include_recipe "apt"
    include_recipe "snow::common"
    
    cryptoName = params[:cryptoName]
    deamonName = params[:deamonName]
    cryptoCode = params[:cryptoCode]
    gitRepo = params[:gitRepo]
    gitRef = params[:gitRef]

    %w(build-essential libssl-dev libboost-all-dev git libdb4.8-dev libdb4.8++-dev pkg-config libminiupnpc-dev).each do |pkg|
        package pkg do
            action :install
        end
    end
    
    unless File.exists? "/usr/bin/#{deamonName}"
      git "/tmp/#{cryptoName}" do
        repository gitRepo
        reference gitRef
        action :sync
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
        not_if { File.exists? "/tmp/#{cryptoName}/src/#{deamonName}" }
      end
    
      bash "/usr/bin/#{deamonName}" do
        code "mv -f /tmp/#{cryptoName}/src/#{deamonName} /usr/bin/#{deamonName}"
      end
    
      directory '/tmp/litecoin' do
        recursive true
        action :delete
      end
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
        
        aws_ebs_volume aws_device do
            aws_access_key aws['aws_access_key_id']
            aws_secret_access_key aws['aws_secret_access_key']
            size node[:snow]["#{deamonName}"][:volume_size]
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
        :rpcallowip => cryptoConfig['rpcallowip'] || '127.0.0.1' ,
        :testnet => cryptoConfig['testnet'] || 0
      })
      owner "ubuntu"
      group "ubuntu"
      mode 0664
    end
    
    service "#{deamonName}" do
      provider Chef::Provider::Service::Upstart
      supports :start => true
      action [:enable, :start]
    end
    
    #monit_monitrc "#{deamonName}" do
    #end
    
    # Automatic backups
    include_recipe "cron"
    
    diskmonit "#{cryptoCode}" do
        path "/#{cryptoCode}"
    end

end
