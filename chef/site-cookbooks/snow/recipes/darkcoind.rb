compilecrypto "darkcoind" do
    cryptoName  "darkcoin"
    deamonName "darkcoind"
    cryptoCode "drk"
    gitRepo "git@github.com:evan82/darkcoin.git"
    gitRef "a9fdaf9fec268e26b931c5eb8d628ccf046839a5"
    compileCommand "cd src && sudo make -f makefile.unix"
end