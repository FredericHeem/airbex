name "solo-logos"
run_list(
  "role[base]",
  "role[pgm]",
  "role[frontend]",
  "role[admin]",
  "role[landing]",
  "role[api]",
  "role[reverse]",
  "role[bitcoind]",
  "role[logosd]",
  "role[workers]"
)