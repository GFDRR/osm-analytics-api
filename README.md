# OpenStreetMap Analytics API

API for [http://osm-analytics.org/](http://osm-analytics.org/)

## Requirements

- Docker + Docker Compose

We recommend using Docker and Docker Compose for simplicity of setup. For native execution, you will also need:
- Nodejs
- Redis
- Nginx

Refer to the corresponding Docker container files for a full list of the dependencies

## Specification

[View the documentation for this API](http://gfw-api.github.io/swagger-ui/?url=https://raw.githubusercontent.com/GFDRR/osm-analytics-api/master/api/doc/swagger.yml)


## Getting started

Before starting, make sure you have Docker and Docker Compose installed and configured, and Control Tower running.

You can the run the API using the following command:

```bash
./api.sh develop
```

Open [http://localhost/api/v1/meta/countries](http://localhost/api/v1/meta/countries) to confirm the API is running.
Refer to the specification above for a full list of available endpoints.

## Production configuration

### Redis

Set overcommit_memory in your server to use the filesystem with redis

```bash
sysctl vm.overcommit_memory=1
```

To have if after reboot add this line to /etc/sysctl.conf:

```bash
vm.overcommit_memory=1
```

#### Clear cache

```
docker exec -it [docker hash] bash
redis-cli
flushall
```
