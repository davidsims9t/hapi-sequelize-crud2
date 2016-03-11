'use strict';

require('babel-polyfill');

const Code = require('code');
const FS = require('fs');
const Hapi = require('hapi');
const HttpStatus = require('http-status-codes');
const Lab = require('lab');
const QS = require('qs');

const mocks = require('./mocks');
const routesToStrings = require('./helpers').routesToStrings;
const snakeCase = require('snake-case');
const lab = exports.lab = Lab.script();
const expect = Code.expect;
const before = lab.before;
const beforeEach = lab.beforeEach;
const after = lab.after;
const afterEach = lab.afterEach;
const describe = lab.describe;
const it = lab.it;

const internals = {
  handlerFile: 'test/handlers/productCategory.{ts}.js',
  currentHandlerFile: null
};

internals.plugin = () => {
  return {
    register: require('../build'),
    options: {
      handlers: 'test/handlers/**/*.js'
    }
  };
};

internals.removeHandler = function() {
  if (internals.currentHandlerFile) {
    try {
      FS.unlinkSync(this.currentHandlerFile);
    } catch (e) {
    }
  }
};

internals.writeHandler = function(def, snakeCase) {
  const filename = (snakeCase ? snakeCase(this.handlerFile) : this.handlerFile).replace('{ts}', Date.now());

  if (typeof def === 'object') {
    def = JSON.stringify(def);
  }

  const file = `module.exports = function (server, ProductCategory) { return ${def}; };`;

  FS.writeFileSync(filename, file);

  internals.currentHandlerFile = filename;
}

describe('hapi-sequelize-crud2 route handler overrides', () => {
  let server, db;

  beforeEach({ timeout: 5000 }, () => {
    internals.removeHandler();

    server = new Hapi.Server();
    server.connection();

    const plugin = {
      register: require('hapi-sequelize'),
      options: {
        models: 'test/models/**/*.js',
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

  after(() => {
    internals.removeHandler();

    return Promise.resolve();
  });

  it('should be able to deactivate all routes for a model', () => {
    internals.writeHandler({ '*': false });

    return server.register([internals.plugin()])
      .then(() => {
        const routes = routesToStrings(server);

        expect(routes).to.not.include([
          `/productCategories|get`,
          `/productCategories|post`,
          `/productCategories/{id}|get`,
          `/productCategories/{id}|put`,
          `/productCategories/{id}|delete`,
          `/productCategories/count|get`
        ]);
      });
  });

  it('should be able to deactivate individual CRUD routes for a model', () => {
    internals.writeHandler({ update: false, destroy: false });

    return server.register([internals.plugin()])
      .then(() => {
        const routes = routesToStrings(server);

        expect(routes).to.include([
          `/productCategories|get`,
          `/productCategories|post`,
          `/productCategories/{id}|get`,
          `/productCategories/count|get`
        ]);

        expect(routes).to.not.include([
          `/productCategories/{id}|put`,
          `/productCategories/{id}|delete`
        ]);
      });
  });

  it('should be able to deactivate all association routes for a model', () => {
    internals.writeHandler({ associations: false });

    return server.register([internals.plugin()])
      .then(() => {
        const routes = routesToStrings(server);

        expect(routes).to.not.include([
          `/productCategories/{aid}/products|get`,
          `/productCategories/{aid}/products|post`,
          `/productCategories/{aid}/products|put`,
          `/productCategories/{aid}/products/{bid}|put`,
          `/productCategories/{aid}/products|delete`,
          `/productCategories/{aid}/products/{bid}|delete`,
          `/productCategories/{aid}/products/count|get`,

          `/productCategories/{aid}/tags|get`,
          `/productCategories/{aid}/tags|post`,
          `/productCategories/{aid}/tags|put`,
          `/productCategories/{aid}/tags/{bid}|put`,
          `/productCategories/{aid}/tags|delete`,
          `/productCategories/{aid}/tags/{bid}|delete`,
          `/productCategories/{aid}/tags/count|get`
        ]);
      });
  });

  it('should be able to deactivate all routes for an individual model association', () => {
    internals.writeHandler({
      associations: {
        tags: false
      }
    });

    return server.register([internals.plugin()])
      .then(() => {
        const routes = routesToStrings(server);

        expect(routes).to.include([
          `/productCategories/{aid}/products|get`,
          `/productCategories/{aid}/products|post`,
          `/productCategories/{aid}/products|put`,
          `/productCategories/{aid}/products/{bid}|put`,
          `/productCategories/{aid}/products|delete`,
          `/productCategories/{aid}/products/{bid}|delete`,
          `/productCategories/{aid}/products/count|get`
        ]);

        expect(routes).to.not.include([
          `/productCategories/{aid}/tags|get`,
          `/productCategories/{aid}/tags|post`,
          `/productCategories/{aid}/tags|put`,
          `/productCategories/{aid}/tags/{bid}|put`,
          `/productCategories/{aid}/tags|delete`,
          `/productCategories/{aid}/tags/{bid}|delete`,
          `/productCategories/{aid}/tags/count|get`
        ]);
      });
  });

  it('should be able to deactivate individual routes for an individual model association', () => {
    internals.writeHandler({
      associations: {
        tags: {
          update: false,
          destroy: false,
          updateMany: false,
          destroyMany: false
        }
      }
    });

    return server.register([internals.plugin()])
      .then(() => {
        const routes = routesToStrings(server);

        expect(routes).to.include([
          `/productCategories/{aid}/products|get`,
          `/productCategories/{aid}/products|post`,
          `/productCategories/{aid}/products|put`,
          `/productCategories/{aid}/products/{bid}|put`,
          `/productCategories/{aid}/products|delete`,
          `/productCategories/{aid}/products/{bid}|delete`,
          `/productCategories/{aid}/products/count|get`,

          `/productCategories/{aid}/tags|get`,
          `/productCategories/{aid}/tags|post`,
          `/productCategories/{aid}/tags/count|get`
        ]);

        expect(routes).to.not.include([
          `/productCategories/{aid}/tags|put`,
          `/productCategories/{aid}/tags/{bid}|put`,
          `/productCategories/{aid}/tags|delete`,
          `/productCategories/{aid}/tags/{bid}|delete`
        ]);
      });
  });

  it('should be able to override handler logic for individual CRUD routes', () => {
    internals.writeHandler('{ count: { handler: function(server, reply) { reply({ count: null }); } } }');

    return server.register([internals.plugin()])
      .then(() => {
        return server.inject({ url: '/productCategories/count' });
      })
      .then(res => {
        expect(res.statusCode).to.equal(HttpStatus.OK);

        const data = JSON.parse(res.payload);

        expect(data).to.be.an.object();
        expect(data.count).to.be.null();
      });
  });
});
