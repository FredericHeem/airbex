name "litecoind"
run_list(
  "recipe[snow::litecoind]",
  "recipe[snow::workers-ltc]",
  "recipe[snow::insight-ltc]"
)
