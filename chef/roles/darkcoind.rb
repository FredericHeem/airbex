name "darkcoind"
run_list(
  "recipe[snow::darkcoind]",
  "recipe[snow::workers-drk]",
  "recipe[snow::insight-drk]"
)
