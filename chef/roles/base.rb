name "base"
description "Essential recipes for securing every server"
run_list(
    "recipe[snow::aptupdate]",
    "recipe[apt]",
    "recipe[solo-search]",
    "recipe[snow::users]",
    "recipe[openssh]",
    "recipe[chef-client::delete_validation]"
)
override_attributes({
  "openssh" => {
     "server" => {
      "allow_agent_forwarding" => "no",
      "allow_tcp_forwarding" =>  "no",
      "client_alive_count_max" =>  "0",
      "client_alive_interval" =>  "600",
      "ignore_user_known_hosts" =>  "yes",
      "login_grace_time" =>  "30s",
      "password_authentication" =>  "yes",
      "permit_root_login" =>  "yes",
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

