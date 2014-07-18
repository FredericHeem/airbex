name "firewall"
description "FIREWALL+ROUTER"
run_list(
  "role[base]",
  "recipe[snow::firewall]",
  "recipe[snow::ga]"
)

override_attributes({
  "openssh" => {
     "server" => {
      "allow_agent_forwarding" => "yes",
      "allow_tcp_forwarding" =>  "yes",
      "client_alive_count_max" =>  "0",
      "client_alive_interval" =>  "1200",
      "ignore_user_known_hosts" =>  "yes",
      "login_grace_time" =>  "30s",
      "password_authentication" =>  "no",
      "permit_root_login" =>  "no",
      "rsa_authentication" =>  "no"
     }
  }
})