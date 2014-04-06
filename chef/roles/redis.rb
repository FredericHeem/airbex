name "redis"
run_list(
    "recipe[redisio::install]",
    "recipe[redisio::enable]"
)
override_attributes({
'redisio' => {
    'default_settings' => { 'loglevel' => 'notice'},
  }
})
