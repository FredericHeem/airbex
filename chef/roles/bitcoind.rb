name "bitcoind"
run_list(
    "recipe[snow::aptupdate]",
    "recipe[snow::crontp]",
    "recipe[monit]",
    "recipe[snow::bitcoind]"
)
