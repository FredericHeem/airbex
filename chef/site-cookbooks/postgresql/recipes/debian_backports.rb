#
# Cookbook Name:: postgresql
# Recipe:: debian_backports
#


# backports for initial support
backports_uri = case node["lsb"]["codename"]
                  when 'wheezy'
                    "http://cdn.debian.net/debian"
                  else
                    "http://backports.debian.org/debian-backports"
                end


apt_repository "debian-backports" do
  uri backports_uri
  distribution "#{node["lsb"]["codename"]}-backports"
  components ["main"]
  action :add
end

# backports support for debian
%w[libpq5 postgresql-common].each do |pkg|
  package pkg do
    options "-t #{node["lsb"]["codename"]}-backports"
  end
end
