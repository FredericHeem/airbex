compilecrypto "dogecoind" do
    cryptoName  "dogecoin"
    deamonName "dogecoind"
    cryptoCode "doge"
    gitRepo "git@github.com:dogecoin/dogecoin.git"
    gitRef "v1.8.2"
    compileCommand "./autogen.sh && ./configure --enable-tests=false && make"
end