compilecrypto "darkcoind" do
    cryptoName  "darkcoin"
    deamonName "darkcoind"
    cryptoCode "drk"
    gitRepo "git@github.com:darkcoinproject/darkcoin.git"
    gitRef "d9f6def36abf765a21301614626fe320406a81c5"
    compileCommand "cd src && sudo make -f makefile.unix"
end