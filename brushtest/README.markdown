Snow api brush test. 
=====

The objective of this subproject is to perform functional and system testing of the snow api exchange. 

Requirements.
---

The snow api server and its database must be up and running. 
 

Install mocha, a testing framework:

```
npm install -g mocha
```

Edit the configuration file `test/config/config.json`  

Run all tests:
----
```
mocha
```

Run tests matching the name Markets:
---
```
mocha -g Markets
```

