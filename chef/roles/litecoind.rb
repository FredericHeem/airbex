name "litecoind"
run_list(
    "recipe[snow::aptupdate]",
    "recipe[snow::crontp]",
    "recipe[monit]",
    "recipe[snow::litecoind]"
)
