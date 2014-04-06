define :deploy_wrapper, :owner => 'root', :group => 'root', :sloppy => false do

    unless params[:ssh_wrapper_dir] and params[:ssh_key_dir] and params[:ssh_key_data]
        error_msg = "deploy_wrapper: one or more of the following required parameters were not set: \
        ssh_wrapper_dir \
        ssh_key_dir \
        ssh_key_data"
        
        Chef::Log.fatal(error_msg)
        raise
    else
        directory params[:ssh_key_dir] do
            owner params[:owner]
            group params[:group]
            mode 0740
            recursive true
        end

        directory params[:ssh_wrapper_dir] do
            owner params[:owner]
            group params[:group]
            mode 0750
            recursive true
        end

        template "#{params[:ssh_key_dir]}/#{params[:name]}_deploy_key" do
            cookbook 'deploy_wrapper'
            source "ssh_deploy_key.erb"
            owner params[:owner]
            group params[:group]
            mode 0600
            variables({ :ssh_key_data => params[:ssh_key_data] })
        end

        template "#{params[:ssh_wrapper_dir]}/#{params[:name]}_deploy_wrapper.sh" do
            cookbook 'deploy_wrapper'
            source "ssh_wrapper.sh.erb"
            owner params[:owner]
            group params[:group]
            mode 0755
            variables({
                :ssh_key_dir => params[:ssh_key_dir],
                :app_name => params[:name],
                :sloppy => params[:sloppy]
            })
        end
    end
end
