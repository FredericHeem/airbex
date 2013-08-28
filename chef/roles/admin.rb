name "admin"
description "Website admin interface"
run_list(
  "recipe[snow::aptupdate]",
  "recipe[nodejs]",
  "recipe[nginx]",
  "recipe[snow::admin]"
)
override_attributes({
  "nginx" => {
    "default_site_enabled" => false
  }
})
