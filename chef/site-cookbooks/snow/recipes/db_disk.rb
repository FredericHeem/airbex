include_recipe "snow::common"
include_recipe "apt"
include_recipe "aws"
include_recipe "awscli"

aws = Chef::EncryptedDataBagItem.load("aws", 'main')
bag = Chef::EncryptedDataBagItem.load("snow", 'main')
env_bag = bag[node.chef_environment]

unless File.exists? '/pgmdata/main/PG_VERSION'
    service 'postgresql' do
        action :stop
    end

    directory "/pgmdata/" do
        action :create
        owner "postgres"
        group "postgres"
    end
    
    if node[:cloud] && node[:cloud][:ec2] && aws['aws_access_key_id']
    
        if node[:app][:ebs][:raid]
            aws_ebs_raid 'data_volume_raid_postgres' do
                aws_access_key aws['aws_access_key_id']
                aws_secret_access_key aws['aws_secret_access_key']
                mount_point '/pgmdata'
                mount_point_owner 'postgres'
                mount_point_group 'postgres'
                mount_point_mode '0700'
                disk_count 2
                disk_size node[:app][:ebs][:size]
                level 10
                filesystem 'ext4'
                action :auto_attach
            end
            mount "/pgmdata" do
                fstype "ext4"
                device "/dev/md0"
                action [:mount, :enable]
            end
        else
            # NOT TESTED
            # Disk is attached to /dev/sdf but shows up
            # in ubuntu as /dev/xvdf
            
            devices = Dir.glob('/dev/xvd?')
            devices = ['/dev/xvdf'] if devices.empty?
            devid = devices.sort.last[-1,1].succ
            node.set_unless[:aws][:ebs_volume][:data_volume][:device] = "/dev/xvd#{devid}"
            device_id = node[:aws][:ebs_volume][:data_volume][:device]
    
            aws_ebs_volume "/dev/sdf" do
                aws_access_key aws['aws_access_key_id']
                aws_secret_access_key aws['aws_secret_access_key']
                volume_id node[:snow][:pgm][:volume_id]
                device device_id.gsub('xvd', 'sd') # aws uses sdx instead of xvdx
                action :attach
            end
        
            mount "/pgmdata" do
                fstype "ext4"
                device device_id
                action [:mount, :enable]
            end
        end
    end
    
    directory "/pgmdata/" do
        owner "postgres"
        group "postgres"
    end
end
