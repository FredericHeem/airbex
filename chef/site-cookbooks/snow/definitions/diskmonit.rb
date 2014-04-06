define :diskmonit, :path => "/", :threshold => "80%" do
  template "#{node["monit"]["includes_dir"]}/diskspace-#{params[:name]}.monitrc" do
    owner "root"
    group "root"
    mode  "0644"
    source "diskspace.monitrc.erb"
    action :create
    notifies :restart, "service[monit]", :delayed
    variables({
      :path => params[:path],
      :name => params[:name],
      :threshold => params[:threshold]
    })
  end
end
