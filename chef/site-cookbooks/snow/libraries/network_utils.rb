require 'ipaddr'

module NetworkUtils
    def self.get_private_ipv4_for_node(node)
        ip_private = "127.0.0.1"
        #Chef::Log.info("get_private_ipv4_for_node: #{node}")
        if node
             Chef::Log.info("fqdn for node is #{node[:fqdn]}")
             
             for interface_key in node[:network][:interfaces].keys
                 Chef::Log.info("interface key #{interface_key}")
                 interface = node[:network][:interfaces][interface_key]
                 Chef::Log.info("interface #{interface}")
                 for address_key in interface[:addresses].keys
                    address = interface[:addresses][address_key]
                    if address.family == "inet" and address.scope == "Global"
                      ip = IPAddress address_key
                      if ip.a?
                         Chef::Log.info("ip #{ip} is private")
                         ip_private = ip.address
                      end
                    end
                 end
             end
        else
            Chef::Log.warn("no node")   
        end
        return ip
    end
end