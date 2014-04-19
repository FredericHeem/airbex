module NetworkUtils
    def self.get_private_ipv4_for_node(node)
        ip = "127.0.0.1"
        #Chef::Log.info("get_private_ipv4_for_node: #{node}")
        if node
             Chef::Log.info("fqdn for node is #{node[:fqdn]}")
             interface = node[:network][:interfaces][:eth1]
             if interface
                 ip = interface[:addresses].detect{|k,v| v[:family] == "inet" }.first
                 Chef::Log.info("ip is #{ip}")
                 if ip.nil?
                     ip = "127.0.0.1"
                 end
             else
               Chef::Log.warn("cannot find eth1 for node for role #{node[:fqdn]}")   
             end
        else
            Chef::Log.warn("no node")   
        end
        return ip
    end
end