compilecrypto "dogecoind" do
    cryptoName  "dogecoin"
    deamonName "dogecoind"
    cryptoCode "doge"
    gitRepo "git@github.com:dogecoin/dogecoin.git"
    gitRef "9bc0ea885ad40b23398a311c5aeae6e18e6bd005"
    compileCommand "cd src && sudo make -f makefile.unix"
end