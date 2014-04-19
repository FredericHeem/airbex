
define :hostentry do    
    roles = params[:roles]
    #Chef::Log.info("Add dns entry for roles: #{roles}")
    for role in roles
        nodes = search(:node, "role:#{role}")
        ip = NetworkUtils.get_private_ipv4_for_node(nodes.first)
        hostsfile_entry "#{node[:hostname]}" do
            ip_address ip
            hostname role
            action :create
        end
    end
end