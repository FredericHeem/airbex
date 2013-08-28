define :swap, :enable => true do
  current_mb = node['memory']['swap']['total'][0..-3].to_i / 1024
  desired_mb = params[:mb].to_i

  unless current_mb == desired_mb
    if current_mb > 0
      bash 'disable swap' do
        code 'swapoff -a'
      end

      mount '/dev/null' do
        action :disable
        device '/var/swapfile'
        fstype 'swap'
      end

      file '/var/swapfile' do
        action :delete
      end
    end

    if desired_mb > 0
      file '/var/swapfile' do
        action :delete
      end

      bash 'allocate swapfile' do
        code "dd if=/dev/zero of=/var/swapfile bs=1M count=#{desired_mb}"
      end

      file '/var/swapfile' do
        mode 600
      end

      bash 'make swapfile' do
        code '/var/swapfile'
      end

      mount '/dev/null' do
        action :enable
        device '/var/swapfile'
        fstype 'swap'
      end

      script 'enable swap' do
        interpreter 'bash'
        code 'swapon -a'
      end
    end
  end
end
