workercrypto "workers-btc" do
    cryptoName  "bitcoin"
    cryptoCode "BTC"
    workerDir "#{node[:snow][:workers][:app_directory]}-btc"
end
 