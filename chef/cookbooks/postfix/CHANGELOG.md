postfix Cookbook CHANGELOG
==========================
This file is used to list changes made in each version of the postfix cookbook.


v3.0.4
------
### Bug
- **[COOK-3824](https://tickets.opscode.com/browse/COOK-3824)** - main.cf.erb mishandles lists

### Improvement
- **[COOK-3822](https://tickets.opscode.com/browse/COOK-3822)** - postfix cookbook readme has an incorrect example
- Got rubocop errors down to 32

### New Feature
- **[COOK-2551](https://tickets.opscode.com/browse/COOK-2551)** - Support creating the sender_canonical map file


v3.0.2
------
### Bug
- **[COOK-3617](https://tickets.opscode.com/browse/COOK-3617)** - Fix error when no there is no FQDN
- **[COOK-3530](https://tickets.opscode.com/browse/COOK-3530)** - Update `client.rb` after 3.0.0 refactor
- **[COOK-2499](https://tickets.opscode.com/browse/COOK-2499)** - Do not use resource cloning

### Improvement
- **[COOK-3116](https://tickets.opscode.com/browse/COOK-3116)** - Add SmartOS support


v3.0.0
------
### Improvement
- **[COOK-3328](https://tickets.opscode.com/browse/COOK-3328)** - Postfix main/master and attributes refactor

**Breaking changes**:
- Attributes are namespaced as `node['postfix']`, `node['postfix']['main']`, and `node['postfix']['master']`.

v2.1.6
------
### Bug
- [COOK-2501]: Reference to `['postfix']['domain']` should be `['postfix']['mydomain']`
- [COOK-2715]: master.cf uses old name for `smtp_fallback_relay` (`fallback_relay`) parameter in master.cf

v2.1.4
------
- [COOK-2281] - postfix aliases uses require_recipe statement

v2.1.2
------
- [COOK-2010] - postfix sasl_auth does not include the sasl plain package

v2.1.0
------
- [COOK-1233] - optional configuration for canonical maps
- [COOK-1660] - allow comma separated arrays in aliases
- [COOK-1662] - allow inet_interfaces configuration via attribute

v2.0.0
------
This version uses platform_family attribute, making the cookbook incompatible with older versions of Chef/Ohai, hence the major version bump.

- [COOK-1535] - `smtpd_cache` should be in `data_directory`, not `queue_directory`
- [COOK-1790] - /etc/aliases template is only in ubuntu directory
- [COOK-1792] - add minitest-chef tests to postfix cookbook

v1.2.2
------
- [COOK-1442] - Missing ['postfix']['domain'] Attribute causes initial installation failure
- [COOK-1520] - Add support for procmail delivery
- [COOK-1528] - Make aliasses template less specific
- [COOK-1538] - Add iptables_rule template
- [COOK-1540] - Add smtpd_milters and non_smtpd_milters parameters to main.cf

v1.2.0
------
- [COOK-880] - add client/server roles for search-based discovery of relayhost

v1.0.0
------
- [COOK-668] - RHEL/CentOS/Scientific/Amazon platform support
- [COOK-733] - postfix::aliases recipe to manage /etc/aliases
- [COOK-821] - add README.md :)

v0.8.4
------
- Current public release.
