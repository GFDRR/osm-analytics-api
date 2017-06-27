# osm analytics api 

[View the documentation for this
API](http://gfw-api.github.io/swagger-ui/?url=https://raw.githubusercontent.com/GFDRR/osm-analytics-api/develop/api/doc/swagger.yml)

1. [Getting Started](#getting-started)
2. [Prod configuration](#prod-configuration)

## Getting Started

### OS X

**First, make sure that you have the [API gateway running
locally](https://github.com/control-tower/control-tower).**

We're using Docker which, luckily for you, means that getting the
application running locally should be fairly painless. First, make sure
that you have [Docker Compose](https://docs.docker.com/compose/install/)
installed on your machine.

```bash

git clone https://github.com/GFDRR/osm-analytics-api
cd osm-analytics-api
./api.sh develop

```

Open [http://localhost/api/v1/meta/contries](http://localhost/api/v1/meta/countries)

## Prod configuration


### Redis
Set overcommit_memory in your server to use the filesystem with redis

```bash

sysctl vm.overcommit_memory=1

```

To have if after reboot add this line to /etc/sysctl.conf:

```bash

vm.overcommit_memory=1

```

