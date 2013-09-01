name "workers"
description "Workers"
run_list(
  "recipe[snow::common]",
  "recipe[snow::aptupdate]",
  "recipe[nodejs]",
  "recipe[logrotate]",
  "recipe[postgresql::client]",
  "recipe[snow::workers]"
)
