include_recipe "aws"
include_recipe "awscli"
aws = Chef::EncryptedDataBagItem.load("aws", 'main')
#aws_bag = aws[node.chef_environment]

if node[:cloud] && node[:cloud][:ec2] && aws['aws_access_key_id']
    aws_elastic_ip "eip_load_balancer_production" do
        aws_access_key aws['aws_access_key_id']
        aws_secret_access_key aws['aws_secret_access_key']
        ip aws['public_ip']
        action :associate
    end
end
