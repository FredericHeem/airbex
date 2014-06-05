name "firewall"
description "FIREWALL+ROUTER"
run_list(
  "recipe[snow::firewall]"
)
