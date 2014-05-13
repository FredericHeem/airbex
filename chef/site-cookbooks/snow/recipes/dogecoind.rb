compilecrypto "dogecoind" do
    cryptoName  "dogecoin"
    deamonName "dogecoind"
    cryptoCode "doge"
    gitRepo "git@github.com:dogecoin/dogecoin.git"
    gitRef "20c2a7ecbb53d034a01305c8e63c0ee327bd9917"
    compileCommand "./autogen.sh && ./configure --enable-tests=false && make"
end