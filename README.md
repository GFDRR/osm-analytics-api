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

### Metadata

The __metadata__ set of endpoints provide data on available countries, their polylines and available features

#### See a list of available country codes

[http://osm-analytics.vizzuality.com/api/v1/meta/countries](http://osm-analytics.vizzuality.com/api/v1/meta/countries)

#### Get an encoded polyline for Switzerland

[http://osm-analytics.vizzuality.com/api/v1/meta/country_polyline/CHE](http://osm-analytics.vizzuality.com/api/v1/meta/country_polyline/CHE)

### Statistics

The __statistics__ set of endpoints expect data from the __metadata__ endpoints, together with optional temporal bounds, and delivers
computed data products based on OSM data

#### Statistics for Switzerland for January 2017

[http://osm-analytics.vizzuality.com/api/v1/stats/all/country/CHE?period=2017-01-01%2C2017-01-3](http://osm-analytics.vizzuality.com/api/v1/stats/all/country/CHE?period=2017-01-01%2C2017-01-31)

#### Statistics a custom polygon, for `buildings` only

[http://osm-analytics.vizzuality.com/api/v1/stats/buildings/polygon/n%7Ez%25257BLypvpB%25257BhcF%25253F%25253Facy%252540fobDdvO](http://osm-analytics.vizzuality.com/api/v1/stats/buildings/polygon/n%7Ez%25257BLypvpB%25257BhcF%25253F%25253Facy%252540fobDdvO)

### Gazeteer

The __Gazeteer__ endpoints make it possible to obtain the OSM IDs matching a given search term, and the associated data (including polygon)
for each of those results.

#### Search for places and OSM IDs matching the string "Madrid"

[http://osm-analytics.vizzuality.com/api/v1/gazeteer/search?q=Madrid](http://osm-analytics.vizzuality.com/api/v1/gazeteer/search?q=Madrid)


#### Get data (inc geometry) for OSM ID 5326784 (from the "Madrid" search)

[http://osm-analytics.vizzuality.com/api/v1/gazeteer/relation/5326784](http://osm-analytics.vizzuality.com/api/v1/gazeteer/relation/5326784)


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

Besides the API endpoints, the codebase includes a script to warm up the cache for certain country-level request, which can be found in `api/app/src/cron-app.js`. 
This script is executed after the new tiles have been loaded, and simulates a request for all features of each specific country.
The responses to these requests are generated and cached, and will readily available for upcoming, "real" requests, speeding up the application.

## Aggregation method for contributions on different features

As information regarding activity in the OSM database is expressed in different units (i.e. number of km for roads or number of individual entries in the case of buildings) we had to normalize the values in order to aggregate them in a meaningful way. The approach we chose is a simplified <a href="https://en.wikipedia.org/wiki/Mahalanobis_distance">Mahalanobis distance</a> (multi-dimensional generalization of the idea of measuring how many standard deviations away a point is from the mean of a distribution) in which, by removing the original dimension from the original data, we are able to describe the features in regards to the whole set of points, allowing us to finally aggregate features of different units in the same histogram. 
