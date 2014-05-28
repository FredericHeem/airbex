name "bitcoind"
run_list(
  "recipe[snow::bitcoind]",
  "recipe[snow::workers-btc]"
)
