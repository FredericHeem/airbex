name "bitcoind"
run_list(
  "recipe[snow::bitcoind]",
  "recipe[snow::armory]",
  "recipe[snow::workers-btc]"
)
