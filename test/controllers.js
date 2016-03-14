'use strict';

require('babel-polyfill');

const Code = require('code');
const FS = require('fs');
const Hapi = require('hapi');
const HttpStatus = require('http-status-codes');
const Lab = require('lab');
const QS = require('qs');

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
  controllerFile: 'test/server/controllers/productCategory.{i}.js',
  currentControllerFile: null,
  iteration: 0
};

internals.plugin = () => {
  return {
    register: require('../build'),
    options: {
      controllers: 'test/server/controllers/**/*.js'
    }
  };
};

internals.removeController = function() {
  if (internals.currentControllerFile) {
    try {
      FS.unlinkSync(this.currentControllerFile);
    } catch (e) {
    }
  }
  ++internals.iteration;
};

internals.writeController = function(def, snakeCase) {
  const filename = (snakeCase ? snakeCase(this.controllerFile) : this.controllerFile).replace('{i}', internals.iteration);

  if (typeof def === 'object') {
    def = JSON.stringify(def);
  }

  const file = `module.exports = function (server, ProductCategory) { return ${def}; };`;

  FS.writeFileSync(filename, file);

  internals.currentControllerFile = filename;
}

describe('hapi-sequelize-crud2 route controller overrides', () => {
  let server, db;

  beforeEach({ timeout: 5000 }, () => {
    internals.removeController();

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

  after(() => {
    internals.removeController();

    return Promise.resolve();
  });

  it('should be able to deactivate all routes for a model', () => {
    internals.writeController({ '*': false });

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
    internals.writeController({ update: false, destroy: false });

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
    internals.writeController({ associations: false });

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
    internals.writeController({
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
    internals.writeController({
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

  it('should be able to override controller logic for individual CRUD routes', () => {
    internals.writeController('{ count: { handler: function(server, reply) { reply({ count: null }); } } }');

    return server.register([internals.plugin()])
      .then(() => {
        return server.inject({ url: '/productCategories/count' });
      })
      .then(res => {
        const data = JSON.parse(res.payload);

        expect(res.statusCode).to.equal(HttpStatus.OK);
        expect(data).to.be.an.object();
        expect(data.count).to.be.null();
      });
  });
});
