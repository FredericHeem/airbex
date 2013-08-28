name "pgs"

run_list(
  "recipe[snow::aptupdate]",
  "recipe[snow::crontp]",
  "recipe[postgresql::server]",
  "recipe[postgresql::contrib]",
  "recipe[aws]",
  "recipe[snow::pgs]"
)

override_attributes(
  "postgresql" => {
    "version" => "9.2",
    "initdb" => false,
    "start" => "disabled",
    "listen_addresses" => "0.0.0.0",
    "pg_hba_defaults" => true,
    "pg_hba" => [
      {
        'type' => 'host',
        'db' => 'all',
        'user' => 'postgres',
        'addr' => '10.0.0.0/16',
        'method' => 'trust'
      }
    ],
    "hot_standby" => "on"
  }
)
