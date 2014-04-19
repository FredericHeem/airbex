name "logosd"
run_list(
  "recipe[snow::logosd]",
  "recipe[snow::workers-lgs]"
)
