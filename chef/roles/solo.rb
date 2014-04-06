name "solo"
run_list(
  "recipe[snow::aptupdate]",
  "recipe[apt]",
  "recipe[solo-search]",
  "role[bitcoind]",
  "recipe[snow::armory]",
  "role[pgm]",
  "role[redis]",
  "recipe[snow::frontend]",
  "role[admin]",
  "role[api]",
  "role[reverse]", 
  "role[workers]",
  "recipe[snow::aws_eip]",
)
