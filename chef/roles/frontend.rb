name "frontend"
description "Website user front-end"
run_list(
  "recipe[snow::frontend]"
)
override_attributes({
  "nginx" => {
    "default_site_enabled" => false
  }
})
