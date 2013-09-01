default['snow']['api']['app_directory'] = "/home/ubuntu/snow-api"
default['snow']['api']['port'] = 8000
default['snow']['api']['smtp'] = nil

default['snow']['reverse']['https_port'] = 8030
default['snow']['reverse']['http_port'] = 8031
default['snow']['reverse']['elb_name'] = "#{node.chef_environment}-reverse"

default['snow']['admin']['port'] = 8020
default['snow']['admin']['app_directory'] = "/home/ubuntu/snow-admin"

default['snow']['frontend']['app_directory'] = "/home/ubuntu/snow-frontend"
default['snow']['frontend']['port'] = 8010

default['snow']['landing']['app_directory'] = "/home/ubuntu/snow-landing"
default['snow']['landing']['port'] = 8050

default['snow']['workers']['app_directory'] = "/home/ubuntu/snow-workers"
