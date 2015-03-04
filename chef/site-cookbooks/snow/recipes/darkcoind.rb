compilecrypto "darkcoind" do
    cryptoName  "darkcoin"
    deamonName "darkcoind"
    cryptoCode "drk"
    gitRepo "git@github.com:darkcoinproject/darkcoin.git"
    gitRef "v0.11.2.0"
    compileCommand "./autogen.sh && ./configure --enable-tests=false --with-incompatible-bdb && make"
end