name "dogecoind"
run_list(
  "recipe[snow::dogecoind]",
  "recipe[snow::workers-doge]",
  "recipe[snow::insight-doge]"
)
