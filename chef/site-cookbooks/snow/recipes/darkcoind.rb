compilecrypto "darkcoind" do
    cryptoName  "darkcoin"
    deamonName "darkcoind"
    cryptoCode "drk"
    gitRepo "git@github.com:darkcoinproject/darkcoin.git"
    gitRef "v0.10.15.17"
    compileCommand "cd src && sudo make -f makefile.unix"
end