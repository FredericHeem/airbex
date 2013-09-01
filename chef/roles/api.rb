name "api"
description "API"
run_list(
  "recipe[snow::common]",
  "recipe[snow::aptupdate]",
  "recipe[nodejs]",
  "recipe[logrotate]",
  "recipe[postgresql::client]",
  "recipe[monit]",
  "recipe[snow::api]"
)
