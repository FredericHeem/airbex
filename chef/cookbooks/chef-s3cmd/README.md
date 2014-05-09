s3cmd Cookbook
==============

This chef cookbook installs the latest s3cmd from the master branch at github.
It downloads the tarball of master: https://github.com/s3tools/s3cmd/archive/master.tar.gz

The latest version of S3CMD from github seems to work better than the older versions included in Ubuntu and CentOS.

Be aware this is an alpha version and not bug free, don't rely on this version for production servers, altho I use it in production servers just fine.

https://github.com/fred/chef-s3cmd


Requirements
------------
  
  This cookbook will install the following packages:

  - python
  - python-setuptools
  - python-distutils-extra


Attributes
----------
TODO: List you cookbook attributes here.

e.g.
#### s3cmd::default
<table>
  <tr>
    <th>Key</th>
    <th>Type</th>
    <th>Description</th>
    <th>Default</th>
  </tr>
  <tr>
    <td><tt>['s3cmd']['url']</tt></td>
    <td>String</td>
    <td>Tarball URL to download s3cmd</td>
    <td><tt>https://github.com/s3tools/s3cmd/archive/master.tar.gz</tt></td>
  </tr>
  <tr>
    <td><tt>['s3cmd']['gpg_passphrase']</tt></td>
    <td>String</td>
    <td>GPG passphrase used to encrypt files before uploading</td>
    <td><tt>some-top-secret-passphrase</tt></td>
  </tr>
  <tr>
    <td><tt>['s3cmd']['encrypt']</tt></td>
    <td>Boolean</td>
    <td>Enable Encryption of files before uploading to S3 using gpg</td>
    <td><tt>false</tt></td>
  </tr>
  <tr>
    <td><tt>['s3cmd']['secret_key']</tt></td>
    <td>String</td>
    <td>AWS secret key</td>
    <td><tt>--</tt></td>
  </tr>
  <tr>
    <td><tt>['s3cmd']['access_key']</tt></td>
    <td>String</td>
    <td>AWS access key</td>
    <td><tt>--</tt></td>
  </tr>
  <tr>
    <td><tt>['s3cmd']['bucket_location']</tt></td>
    <td>String</td>
    <td>Datacentre to create bucket in. As of now the datacenters are: US (default), EU, ap-northeast-1, ap-southeast-1, sa-east-1, us-west-1 and us-west-2</td>
    <td><tt>US</tt></td>
  </tr>
  <tr>
    <td><tt>['s3cmd']['user']</tt></td>
    <td>String</td>
    <td>User to install .s3cfg config file</td>
    <td><tt>ubuntu</tt></td>
  </tr>
  <tr>
    <td><tt>['s3cmd']['config_dir']</tt></td>
    <td>String</td>
    <td>Directory where the .s3cfg config file will be installed.  This must be explicitly set if the user account is created by chef.</td>
    <td><tt>['s3cmd']['user']'s home directory</tt></td>
  </tr>
</table>

Usage
-----

#### s3cmd::default
TODO: Write usage instructions for each cookbook.

e.g.
Just include `s3cmd` in your node's `run_list` and configure it

```json
{
  "s3cmd": {
    "user": "fred",
    "encrypt": true,
    "gpg_passphrase": "some-top-secret-passphrase",
    "secret_key": "your-secret-key",
    "access_key": "your-access-key",
    "bucket_location": "EU"
  },
  "run_list": [
    "recipe[s3cmd]"
  ]
}
```

Contributing
------------

1. Fork the repository on Github
2. Create a named feature branch (like `add_component_x`)
3. Write you change
4. Write tests for your change (if applicable)
5. Run the tests, ensuring they all pass
6. Submit a Pull Request using Github


License and Authors
-------------------

Authors: Frederico Araujo (github.com/fred)
Contributors: Steven Lehrburger (github.com/lehrblogger)
