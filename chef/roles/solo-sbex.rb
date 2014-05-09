name "solo-sbex"
run_list(
  "role[base]",
  "role[pgm]",
  "role[frontend]",
  "role[admin]",
  "role[landing]",
  "role[api]",
  "role[bitcoind]",
  "role[workers]",
  "role[reverse]",
  "recipe[snow::aws_eip]"
)
