name "reverse"
description "Reverse proxy server"
run_list(
  # "recipe[snow::build]",
  "recipe[snow::aptupdate]",
  # "recipe[elb]",
  "recipe[nginx]",
  "recipe[snow::reverse]"
)
override_attributes({
  "nginx" => {
    "default_site_enabled" => false
  }
})
