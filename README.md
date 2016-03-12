hapi-sequelize-crud2
====================

Automatically generate a (more) RESTful API for your models and associations, with simple route configuration and behavior extensibility.

This plugin depends on [`hapi-sequelize`](https://github.com/danecando/hapi-sequelize), and builds on the work of [`hapi-sequelize-crud`](https://github.com/mdibaiee/hapi-sequelize-crud).

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
    prefix: '', // Global prefix for all routes
    scopePrefix: 's', // Prefix for model scope routes (see below)
    snakeCase: false, // Create routes with snake_case instead of default camelCase
    handlers: 'handlers/**/*.js', // Glob to handler override files (can be array) [see below]
    private: [] // Array of model names to exclude from route creation
  }
});
```

Please note that you should register `hapi-sequelize-crud2` after defining your
associations.

##What do I get

Let's say you have a `many-to-many` association like this:

```javascript
Team.belongsToMany(Role, { through: 'TeamRoles' });
Team.hasOne(Player, { as: 'captain' });
```

You get these CRUD routes:

| Method | Route | Name |
|---|---|---|
| GET | `/teams` | index<sup>1 2 3</sup> |
| GET | `/teams/{id}` | get<sup>2</sup> |
| POST | `/teams` | create |
| PUT | `/teams/{id}` | update |
| DELETE | `/teams/{id}` | destroy |
| GET | `/teams/s/{scope}` | scope<sup>1 2 3</sup> |
| GET | `/teams/count` | count<sup>1</sup> |


And these one-to-one association routes:

| Method | Route | Name | Description |
|---|---|---|---|
| GET | `/teams/{id}/captain` | index<sup>2</sup> |
| POST | `/teams/{id}/captain` | create | Create a new related model and sets the association |
| PUT | `/teams/{id}/captain/{aid}` | update | Sets the association with an existing related model |
| DELETE | `/teams/{id}/captain` | destroy | Unsets the association |

And these one-to-many association routes:

| Method | Route | Name | Description |
|---|---|---|---|
| GET | `/teams/{id}/roles` | index<sup>1 2 3</sup> |
| POST | `/teams/{id}/roles` | create | Create a new related model and adds it to the associations |
| PUT | `/teams/{id}/roles/{aid}` | update | Sets the association with an existing related model |
| PUT | `/teams/{id}/roles` | updateMany | Sets the association with a many related models, as provided by id[] querystring parameter |
| DELETE | `/teams/{id}/roles/{aid}` | destroy | Unsets the association |
| DELETE | `/teams/{id}/roles` | destroyMany | Unsets all associations, optionally limited to those given by id[] querystring parameter |
| GET | `/teams/{id}/roles/count` | count<sup>1</sup> | Counts the number of associated models |
