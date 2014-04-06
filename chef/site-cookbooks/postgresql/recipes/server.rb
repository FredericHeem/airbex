#
# Cookbook Name:: postgresql
# Recipe:: server
#

include_recipe "postgresql"

# don't auto-start the service to allow custom configuration
dpkg_autostart "postgresql" do
  allow false
end

# install the package
package "postgresql-#{node["postgresql"]["version"]}"

# setup the data directory
include_recipe "postgresql::data_directory"

# add the configuration
include_recipe "postgresql::configuration"

# declare the system service
include_recipe "postgresql::service"

# setup users
include_recipe "postgresql::pg_user"

# setup databases
include_recipe "postgresql::pg_database"



