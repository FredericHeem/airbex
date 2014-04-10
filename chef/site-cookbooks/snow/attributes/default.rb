default['snow']['api']['app_directory'] = "/home/ubuntu/snow-api"
default['snow']['api']['port'] = 8000
default['snow']['api']['smtp'] = nil

default['snow']['reverse']['https_port'] = 80
default['snow']['reverse']['http_port'] = 8031
default['snow']['reverse']['elb_name'] = "#{node.chef_environment}-reverse"
default['snow']['reverse']['access_log'] = "/var/log/snow-reverse-access.log"
default['snow']['reverse']['error_log'] = "/var/log/snow-reverse-error.log"

default['snow']['admin']['port'] = 8020
default['snow']['admin']['app_directory'] = "/home/ubuntu/snow-admin"

default['snow']['frontend']['app_directory'] = "/home/ubuntu/snow-frontend"
default['snow']['frontend']['port'] = 8010

default['snow']['landing']['app_directory'] = "/home/ubuntu/snow-landing"
default['snow']['landing']['port'] = 8050


default['snow']['workers']['app_directory'] = "/home/ubuntu/snow-workers"
default['snow']['workers']['bitcoinin']['min_conf'] = 6
default['snow']['workers']['litecoinin']['min_conf'] = 6


default['snow']['workers_lgs']['app_directory'] = "/home/ubuntu/snow-workers-lgs"
default['snow']['workers']['logosin']['min_conf'] = 6

default['snow']['branch'] = 'master'

# Append to the existing (ssh and load)
default["monit"]["default_monitrc_configs"] = []

default['snow']['frontend']['branch'] = 'master'

node.set['varnish']['listen_port'] = 8030

default['postgresql']['initdb'] = false
default['postgresql']['version'] = "9.2"
default['postgresql']['data_directory'] = "/pgmdata/main/"
default['postgresql']['hba_file'] = "/pgmdata/main/pg_hba.conf"
default['postgresql']['ident_file'] = "/pgmdata/main/pg_ident.conf"

default[:app][:ec2] = false
default[:app][:ebs] = {
  :raid => true,
  :size => 10 # size is in GB
}

aws = Chef::EncryptedDataBagItem.load("aws", 'main')

if aws['aws_access_key_id']
    default['s3cmd']['secret_key'] = aws['aws_secret_access_key']
    default['s3cmd']['access_key'] = aws['aws_access_key_id']
    default['s3cmd']['user'] = 'postgres'

end
