'use strict';

require('babel-polyfill');

const Code = require('code');
const Hapi = require('hapi');
const Lab = require('lab');

const mocks = require('./mocks');
const routesToStrings = require('./helpers').routesToStrings;
const snakeCase = require('snake-case');
const lab = exports.lab = Lab.script();
const expect = Code.expect;
const beforeEach = lab.beforeEach;
const describe = lab.describe;
const it = lab.it;

const expectCrudRoutes = (routes, modelName, prefix) => {
  if (prefix === undefined) prefix = '';

  expect(routes).to.include([
    `${prefix}/${modelName}|get`,
    `${prefix}/${modelName}|post`,
    `${prefix}/${modelName}/{id}|get`,
    `${prefix}/${modelName}/{id}|put`,
    `${prefix}/${modelName}/{id}|delete`,
    `${prefix}/${modelName}/count|get`
  ]);
}

const expectScopeRoutes = (routes, modelName, prefix) => {
  if (prefix === undefined) prefix = 's';

  expect(routes).to.include(`/${modelName}/${prefix}/{scope}|get`);
}

const expectOneToOneRoutes = (routes, modelName, associationName) => {
  expect(routes).to.include([
    `/${modelName}/{id}/${associationName}|get`,
    `/${modelName}/{id}/${associationName}|post`,
    `/${modelName}/{id}/${associationName}/{aid}|put`,
    `/${modelName}/{id}/${associationName}/{aid}|delete`
  ]);
}

const expectOneToManyRoutes = (routes, modelName, associationName) => {
  expect(routes).to.include([
    `/${modelName}/{id}/${associationName}|get`,
    `/${modelName}/{id}/${associationName}|post`
    `/${modelName}/{id}/${associationName}|put`,
    `/${modelName}/{id}/${associationName}/{aid}|put`,
    `/${modelName}/{id}/${associationName}|delete`,
    `/${modelName}/{id}/${associationName}/{aid}|delete`,
    `/${modelName}/{id}/${associationName}/count|get`
  ]);
}

describe('hapi-sequelize-crud2', () => {
  let server, db;

  beforeEach({ timeout: 5000 }, () => {
    server = new Hapi.Server();
    server.connection();

    const plugin = {
      register: require('hapi-sequelize'),
      options: {
        models: 'test/server/models/**/*.js',
        sequelize: {
          dialect: 'sqlite',
          define: {
            timestamps: false
          }
        }
      }
    };

    return server.register([plugin])
      .then(() => {
        db = server.plugins['hapi-sequelize'].db.sequelize;

        return db.sync({ force: true });
      });
  });

  it('should register CRUD routes for each model', () => {
    const plugin = {
      register: require('../build')
    };

    return server.register([plugin])
      .then(() => {
        const routes = routesToStrings(server);

        for (const modelName of Object.keys(db.models)) {

          const model = db.models[modelName];
          const name = model.options.name.plural;

          expectCrudRoutes(routes, name);
        }
      });
  });

  it('should prefix all CRUD routes if option given', () => {
    const prefix = '/api/v1';

    const plugin = {
      register: require('../build'),
      options: {
        prefix: prefix
      }
    };

    return server.register([plugin])
      .then(() => {
        const routes = routesToStrings(server);

        for (const modelName of Object.keys(db.models)) {
          const model = db.models[modelName];
          const name = model.options.name.plural;

          expectCrudRoutes(routes, name, prefix);
        }
      });
  });

  it('should not register CRUD routes for any models listed in private option', () => {
    const privates = ['private'];

    const plugin = {
      register: require('../build'),
      options: {
        private: privates
      }
    };

    return server.register([plugin])
      .then(() => {
        const routes = routesToStrings(server);

        for (const modelName of privates) {
          const model = db.models[modelName];
          const name = model.options.name.plural;

          expect(routes).to.not.include(`/${name}|get`);
        }
      });
  });

  it('should use snake_case model names in routes if option given', () => {
    const plugin = {
      register: require('../build'),
      options: {
        snakeCase: true
      }
    };

    return server.register([plugin])
      .then(() => {
        const routes = routesToStrings(server);

        for (const modelName of Object.keys(db.models)) {
          const model = db.models[modelName];
          const name = snakeCase(model.options.name.plural);

          expectCrudRoutes(routes, name);
        }
      });
  });

  it('should register each model scope as route', () => {
    const plugin = {
      register: require('../build')
    };

    return server.register(require('../build'))
      .then(() => {
        const routes = routesToStrings(server);

        for (const modelName of Object.keys(db.models)) {
          const model = db.models[modelName];
          const name = model.options.name.plural;

          expectScopeRoutes(routes, name);
        }
      });
  });

  it('should register each model scope with specific route prefix if given', () => {
    const scopePrefix = 'of';

    const plugin = {
      register: require('../build'),
      options: {
        scopePrefix: scopePrefix
      }
    };

    return server.register([plugin])
      .then(() => {
        const routes = routesToStrings(server);

        for (const modelName in db.models) {
          const model = db.models[modelName];
          const name = model.options.name.plural;

          expectScopeRoutes(routes, name, scopePrefix);
        }
      });
  });

  it('should register routes for each model relation', () => {
    const plugin = {
      register: require('../build')
    };

    return server.register(require('../build'))
      .then(() => {
        const routes = routesToStrings(server);

        for (const modelName in db.models) {
          const model = db.models[modelName];
          const name = model.options.name.plural;

          for (const key in db.associations) {
            const association = model.associations[key];
            let associationNameKey, expectFunc;

            switch (association.associationType) {
              case 'HasOne':
              case 'BelongsTo':
                associationNameKey = 'singular',
                expectFunc = expectOneToOneRoutes;
                break;

              case 'HasMany':
              case 'BelongsTo':
                associationNameKey = 'plural',
                expectFunc = expectOneToOneRoutes;
                break;
            }

            expectFunc(routes, name, association.options.name[associationNameKey]);
          }
        }
      });
  });
});
