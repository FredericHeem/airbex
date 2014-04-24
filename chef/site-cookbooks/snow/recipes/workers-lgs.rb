workercrypto "workers-lgs" do
    cryptoName  "logos"
    cryptoCode "LGS"
    scale 2
    workerDir "#{node[:snow][:workers][:app_directory]}-lgs"
end
 