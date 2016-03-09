hapi-sequelize-crud2
====================

Automatically generate a (more) RESTful API for your models and associations

This plugin depends on [`hapi-sequelize`](https://github.com/danecando/hapi-sequelize).

```
npm install -S hapi-sequelize-crud2
```

##Configure

```javascript
// First, register hapi-sequelize
await register({
  register: require('hapi-sequelize'),
  options: { ... }
});

// Then, define your associations
let db = server.plugins['hapi-sequelize'].db;
let models = db.sequelize.models;
associations(models); // pretend this function defines our associations

// Now, register hapi-sequelize-crud2
await register({
  register: require('hapi-sequelize-crud2'),
  options: {
    prefix: '/v1'
  }
});
```

Please note that you should register `hapi-sequelize-crud` after defining your
associations.

##What do I get

Let's say you have a `many-to-many` association like this:

```javascript
Team.belongsToMany(Role, { through: 'TeamRoles' });
Role.belongsToMany(Team, { through: 'TeamRoles' });
```

You get these:

```
# get an array of records
GET /teams/{id}/roles
GET /roles/{id}/teams
# might also append query parameters to search for
GET /roles/{id}/teams?members=5

# create
POST /teams/{id}/roles
POST /roles/{id}/teams

# add to associations
PUT /teams/{id}/role/{id}
PUT /roles/{id}/team/{id}

# delete
DELETE /teams/{id}
DELETE /roles/{id}

# un-associate
DELETE /teams/{id}/roles/{id}
DELETE /roles/{id}/teams/{id}

# count
GET /teams/count
GET /roles/{id}/teams/count

# you can specify a prefix to change the URLs like this:
GET /v1/teams/{id}/roles
```
