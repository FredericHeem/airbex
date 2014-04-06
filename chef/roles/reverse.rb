name "reverse"
description "Reverse proxy server"
run_list(
  "recipe[snow::reverse]"
)
override_attributes({
  "nginx" => {
    "default_site_enabled" => false
  }
})
