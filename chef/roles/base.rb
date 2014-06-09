name "base"
description "Essential recipes for securing every server"
run_list(
    "recipe[snow::aptupdate]",
    "recipe[apt]",
    "recipe[solo-search]",
    "recipe[snow::users]",
    "recipe[openssh]",
    "recipe[iptables]",
    "recipe[iptables::ssh]",
    "recipe[chef-client::delete_validation]"
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
  },
  "authorization" => {
    "sudo" => {
      "groups" => ["admin", "wheel", "sysadmin"],
      "users" => ["ubuntu", "ops", "vagrant"],
      "passwordless" => true
    }
  }  
})

