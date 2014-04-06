#
# Cookbook Name:: postgresql
# Recipe:: service
#


actions = {
    "auto" => [:enable, :start],
    "disabled" => [:disable, :stop],
    "manual" => [:enable]
}

# define the service
service "postgresql" do
  supports :restart => true
  action actions[node["postgresql"]["start"]]
end
