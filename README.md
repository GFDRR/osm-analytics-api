# OpenStreetMap Analytics API

API for [http://osm-analytics.org/](http://osm-analytics.org/)

## Requirements

- Docker + Docker Compose

We recommend using Docker and Docker Compose for simplicity of setup. For native execution, you will also need:
- Nodejs
- Redis
- Nginx

Refer to the corresponding Docker container files for a full list of the dependencies

## Documentation and examples

[View the full documentation for this API](http://gfw-api.github.io/swagger-ui/?url=https://raw.githubusercontent.com/GFDRR/osm-analytics-api/master/api/doc/swagger.yml)

#### See a list of available country codes

[http://osm-analytics.vizzuality.com/api/v1/meta/countries](http://osm-analytics.vizzuality.com/api/v1/meta/countries)

#### Get an encoded polyline for Switzerland

[http://osm-analytics.vizzuality.com/api/v1/meta/country_polyline/CHE](http://osm-analytics.vizzuality.com/api/v1/meta/country_polyline/CHE)

#### Statistics for Switzerland for January 2017

[http://osm-analytics.vizzuality.com/api/v1/stats/all/country/CHE?period=2017-01-01%2C2017-01-3](http://osm-analytics.vizzuality.com/api/v1/stats/all/country/CHE?period=2017-01-01%2C2017-01-31)


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

Set `overcommit_memory` in your server to use the filesystem with redis

```bash
sysctl vm.overcommit_memory=1
```

To have if after reboot add this line to `/etc/sysctl.conf`:

```bash
vm.overcommit_memory=1
```

#### Clear cache

```
docker exec -it [docker hash] bash
redis-cli
flushall
```


## Internals

The project contains several components, which are managed by the included `docker` configuration. 
The root folders contain several files and folders necessary to boot up the `docker` setup and services which sit on top of it. 

The main component is the API, which is built Nodejs + NPM, and can be found in the `api/` folder. 
Refer to the `api/package.json` for a full list of dependencies of the API, and `api/doc` for documentation on the endpoints available on the API.

Besides the API endpoints, the codebase includes scripts to warm up the cache `api/app/src/cron-app.js` 
