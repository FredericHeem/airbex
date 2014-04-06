name "pgs"

run_list(
  "recipe[solo-search]",
  "recipe[snow::pgs]"
)

override_attributes(
  "postgresql" => {
    "version" => "9.2",
    "initdb" => false,
    "start" => "disabled",
    "listen_addresses" => "0.0.0.0",
    "wal_level" => "archive",
    
    "archive_mode" => "on",
    "archive_command" => "envdir /etc/wal-e.d/env /usr/local/bin/wal-e wal-push %p",
    "archive_timeout" => 60,

    "max_wal_senders" => 2,
    "wal_keep_segments" => 32,
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
    "hot_standby" => "on",
    "log_min_duration_statement" => 100,
    "log_line_prefix" => "%t [%p]: [%l-1] db=%d,user=%u ",
    "log_checkpoints" => "on",
    "log_connections" => "on",
    "log_disconnections" => "on",
    "log_lock_waits" => "on"
  }
)
