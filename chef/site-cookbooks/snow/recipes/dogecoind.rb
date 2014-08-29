compilecrypto "dogecoind" do
    cryptoName  "dogecoin"
    deamonName "dogecoind"
    cryptoCode "doge"
    gitRepo "git@github.com:dogecoin/dogecoin.git"
    gitRef "65228644e10328172e9fa3ebe64251983e1153b3"
    compileCommand "./autogen.sh && ./configure --enable-tests=false && make"
end