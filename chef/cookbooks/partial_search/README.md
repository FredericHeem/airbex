Partial Search Cookbook
=======================
Partial Search is a new search API currently available only on Opscode
Hosted Chef that can be used to reduce the network bandwidth and the
memory used by chef-client to process search results.

This cookbook provides an experimental interface to the partial search
API by providing a `partial_search` method that can be used instead of
the `search` method in your recipes.

The `partial_search` method allows you to retrieve just the attributes
of interest. For example, you can execute a search to return just the
name and IP addresses of the nodes in your infrastructure rather than
receiving an array of complete node objects and post-processing them.


Install
-------
Upload this cookbook and include it in the dependencies of any
cookbook where you would like to use `partial_search`.


Usage
-----
When you call `partial_search`, you need to specify the key paths of the
attributes you want returned. Key paths are specified as an array
of strings. Each key path is mapped to a short name of your
choosing. Consider the following example:

```ruby
partial_search(:node, 'role:web',
   :keys => { 'name' => [ 'name' ],
              'ip'   => [ 'ipaddress' ],
              'kernel_version' => [ 'kernel', 'version' ]
            }
).each do |result|
  puts result['name']
  puts result['ip']
  puts result['kernel_version']
end
```

In the example above, two attributes will be extracted (on the
server) from the nodes that match the search query. The result will
be a simple hash with keys 'name'  and 'ip'.


Notes
-----
* We would like your feedback on this feature and the interface
  provided by this cookbook. Please send comments to the chef-dev
  mailing list.

* The partial search API will eventually be available in the Open Source Chef
  Server.

* The partial search API is available in Opscode Private Chef since
  1.2.2


License & Authors
-----------------
- Author:: Adam Jacob (<adam@opscode.com>)
- Author:: John Keiser (<jkeiser@opscode.com>)

```text
Copyright:: 2012-2013, Opscode, Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```
