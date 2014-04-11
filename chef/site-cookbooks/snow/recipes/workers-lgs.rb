workercrypto "workers-lgs" do
    cryptoName  "logos"
    cryptoCode "LGS"
    workerDir node[:snow][:workers_lgs][:app_directory]
    minConf 6
end
 