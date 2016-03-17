hapi-sequelize-crud2
====================

Automatically generate a RESTful API for your models and associations, with simple route configuration and behavior extensibility.

This plugin depends on [`hapi-sequelize`](https://github.com/danecando/hapi-sequelize), and builds on the work of [`hapi-sequelize-crud`](https://github.com/mdibaiee/hapi-sequelize-crud).

```
npm install -S hapi-sequelize-crud2
```

##Configure

```javascript
// First, register hapi-sequelize
await server.register({
  register: require('hapi-sequelize'),
  options: { ... }
});

// Then, define your associations
const db = server.plugins['hapi-sequelize'].db;
const models = db.sequelize.models;
associations(models); // pretend this function defines our associations

// Now, register hapi-sequelize-crud2
await server.register({
  register: require('hapi-sequelize-crud2'),
  options: {
    prefix: '', // Global prefix for all routes
    scopePrefix: 's', // Prefix for model scope routes (see below)
    snakeCase: false, // Create routes with snake_case instead of default camelCase
    controllers: 'controllers/**/*.js', // Glob to handler controller override files (can be array) [see below]
    private: [] // Array of model names to exclude from route creation
  }
});
```

Please note that you should register `hapi-sequelize-crud2` after defining your
associations.

##What do I get

Let's say you have associations like this:

```javascript
Team.belongsToMany(Role, { through: 'teamRoles' });
Team.hasOne(Player, { as: 'captain' });
```

You get these CRUD routes:

| Method | Route | Name |
|---|---|---|
| GET | `/teams` | index<sup>1 2 3</sup> |
| GET | `/teams/{id}` | get<sup>3</sup> |
| POST | `/teams` | create |
| PUT | `/teams/{id}` | update |
| DELETE | `/teams/{id}` | destroy |
| GET | `/teams/s/{scope}` | scope<sup>1 2 3</sup> |
| GET | `/teams/count` | count<sup>1</sup> |


And these one-to-one association routes:

| Method | Route | Name | Description |
|---|---|---|---|
| GET | `/teams/{id}/captain` | index<sup>3</sup> | Retrieve the related model | 
| POST | `/teams/{id}/captain` | create | Create a new related model and sets the association |
| PUT | `/teams/{id}/captain/{aid}` | update | Sets the association with an existing related model |
| DELETE | `/teams/{id}/captain` | destroy | Unsets the association |

And these one-to-many association routes:

| Method | Route | Name | Description |
|---|---|---|---|
| GET | `/teams/{id}/roles` | index<sup>1 2 3</sup> | Retrieve the related models |
| POST | `/teams/{id}/roles` | create | Create a new related model and adds it to the associations |
| PUT | `/teams/{id}/roles/{aid}` | update | Sets the association with an existing related model |
| PUT | `/teams/{id}/roles` | updateMany | Sets the association with a many related models, as provided by id[] querystring parameter |
| DELETE | `/teams/{id}/roles/{aid}` | destroy | Unsets the association |
| DELETE | `/teams/{id}/roles` | destroyMany | Unsets all associations, optionally limited to those given by id[] querystring parameter |
| GET | `/teams/{id}/roles/count` | count<sup>1</sup> | Counts the number of associated models |

<sup>1</sup> Accepts a query string parameter object `filter` to limit results by given criteria, e.g. `?filter[status]=active`

<sup>2</sup> Accepts query string parameters `limit` and `offset` to control paginated results

<sup>3</sup> Accepts a querystring parameter `include` to include a related model with the returned parent model

##Custom Route Configuration
Automatic route handling is convenient for getting a basic API in place during development. But 
in a production application, authentication, ACL and caching concerns need to be addressed. 
Taking advantage of Hapi's convention over configuration approach to route set-up, you can easy
extend and override the plugin's default route options and handler.

Simply create a file named modelName.js (or model_name.js if you prefer) in your controllers path 
defined in the plugin options, and your options will be mixed in during route registration. A 
controller should export a function that accepts two arguments, a Hapi server instance and the model
object, and returns an object mapping route names to Hapi route configuration object partials or 
`false` to disable a route.

Include a default configuration to apply to all routes in a controller by setting the `*` key. 
Apply only to all association routes by setting `associations.*`. To set a default controller,
include a `_default.js` file in your controllers file path.

For example, a read-only endpoint with limited scope access may look like:

```javascript
// This standard Hapi package make composing 
// route configuration options easy
const Hoek = require('hoek');
const Joi = require('joi');

modules.export = function(server, Team) {
  const plural = Team.options.name.plural;
  
  return {
    '*': {
      cache: {
        expiresIn: 30 * 1000,
        private: 'private'
      }
    },
    
    scope: {
      config: {
        validation: {
          params: {
            scope: Joi.string().valid('scope1', 'scope2')
          }
        }
      }
    },
    
    count: {
      path: `${plural}/total`,
      handler: function(request, reply) {
        ...
        const total = ...;
        
        reply({total: total}); 
      }
    },
        
    create: false,
    update: false,
    destroy: false,
    
    associations: {
      captain: {
        create: false,
        update: false,
        destroy: false
      },
      
      roles: false
    }
  };
});
```

## Provide Already Retrieved Model
Have you already queried for and retrieved the model instance (or parent instance for association
routes) earlier in your pre-handler cycle? You can provide this to the plugin by assigning the
`request.pre.model` key to your request object and it will not execute the find query.

## Dynamic Scope Limiting
Need to assign a scope based on ACL or other pre-handler results? Assign the `request.pre.scope` key
to your request object and it will apply the supplied pre-defined model scopes to the find queries.
