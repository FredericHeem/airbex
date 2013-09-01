name "bitcoind"
run_list(
  "recipe[snow::common]",
    "recipe[snow::aptupdate]",
    "recipe[snow::crontp]",
    "recipe[monit]",
    "recipe[snow::bitcoind]"
)
