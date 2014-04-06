name "cache"
run_list(
  "recipe[snow::cache]"
)
override_attributes({
    'varnish' => {
        'vcl_conf' => 'snow-cache.vcl',
        'version' => '3.0'
    }
})
