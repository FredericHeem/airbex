compilecrypto "darkcoind" do
    cryptoName  "darkcoin"
    deamonName "darkcoind"
    cryptoCode "drk"
    gitRepo "git@github.com:darkcoinproject/darkcoin.git"
    gitRef "826f2a223227738deef09c6696eada0d119ae297"
    compileCommand "cd src && sudo make -f makefile.unix"
end