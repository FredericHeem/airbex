# Snow

Snow is a digital currency exchange engine written in node.js.

Snow uses postgresql as its database engine and is currently being developed for Ubuntu 12.04.

It currently supports deposits and withdrawals operations on **Bitcoin**, **Litecoin** and **Ripple** as well as a trading engine.

## Project Overview

### Roles and components:

A fully functional Snow system includes 7 roles, the install scripts are located in the /ops/ folder

#### Roles

Role | Install script | Description 
--- | --- | --- |
pgm | /ops/pg/master.sh | The database master, all the write queries are sent to this node
pgs| /ops/pg/slave.sh | The read only node acts a live backup of the master
api| /ops/api/setup.sh | The API node exposes the API to the web server. It is responsible for most of the database operations and contain the business logic
workers | /ops/workers/setup.sh | The workers communicates to the database and is reponsible to relay transactions from and to the Bitcoin, Litecoin and Ripple networks
web | not included | The client facing web server that communicates with the API
bitcoin | not included | The Bitcoin node that communicates to the workers via RPC calls
litecoin | not included| The Litecoin node that communicates to the workers via RPC calls


#####  Folder Sructure

Path | Content | Description |
--- | --- | --- |
/admin/ | admin | node.js code for the snow admin interface role |
/workers/ | worker | node.js code for the workers role|
/api/ | api  | node.js code for the snow api server role | 
/client/ | client api | node.js client library for accessing the market |
/db/ | database scripts|Contains initialization, migration and test scripts for the postgresql database |
/docs/ | documentation | API and Activity types documentation | 
/ops/ | snow-ops | Installation scripts and network topology


#####  [API Documentation](https://github.com/justcoin/snow/blob/master/docs/calls.md)

#####  [Snow-Ops and Network topology](https://github.com/justcoin/snow/blob/master/ops/README.markdown)
