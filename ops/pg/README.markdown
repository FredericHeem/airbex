PostgreSQL database
===

Everything is stored in a single PostgreSQL database. The database is stored on an EBS volume attached to the master server. The database is replicated to a slave server using [streaming](http://www.postgresql.org/docs/current/static/warm-standby.html#STREAMING-REPLICATION), [synchronous](http://www.postgresql.org/docs/current/static/warm-standby.html#SYNCHRONOUS-REPLICATION) replication. The slave server can be used for reads to offload the master server.

Backup
---

TODO: ship to s3 with cron job? separate az?
