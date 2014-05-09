include_recipe "apt"
include_recipe "snow::common"
include_recipe "varnish"

reverse_ip = '127.0.0.1'

template '/etc/varnish/snow-cache.vcl' do
  source "cache/snow-cache.vcl.erb"
  owner "root"
  group "root"
  variables({
    :reverse_ip => reverse_ip || '127.0.0.1'
  })
  notifies :reload, resources(:service => "varnish")
end
