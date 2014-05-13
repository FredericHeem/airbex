compilecrypto "darkcoind" do
    cryptoName  "darkcoin"
    deamonName "darkcoind"
    cryptoCode "drk"
    gitRepo "git@github.com:darkcoinproject/darkcoin.git"
    gitRef "1a2ed9cc10d41b310cf41f6d628f639e3533a2e8"
    compileCommand "cd src && sudo make -f makefile.unix"
end