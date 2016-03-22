'use strict';

require('babel-polyfill');

const Code = require('code');
const FS = require('fs');
const Hapi = require('hapi');
const Helpers = require('./helpers/server');
const HttpStatus = require('http-status-codes');
const Lab = require('lab');
const Mocks = require('./helpers/mocks');
const Path = require('path');
const QS = require('qs');

const routesToStrings = Helpers.routesToStrings;
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
  defaultFile: 'test/server/controllers/_default.js',
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

internals.writeController = function(def, snakeCase, writeDefault) {
  writeDefault = !!writeDefault;

  const filename = (snakeCase ? snakeCase(this.controllerFile) : this.controllerFile).replace('{i}', internals.iteration);

  if (typeof def === 'object') {
    def = JSON.stringify(def);
  }

  const argName = writeDefault ? 'Model' : 'ProductCategory';
  const file = `module.exports = function (server, ${argName}) { return ${def}; };`;

  const writeTarget = writeDefault ? Path.resolve(this.defaultFile) : filename;

  FS.writeFileSync(writeTarget, file);

  internals.currentControllerFile = writeTarget;
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

  afterEach(() => {
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
          `/productCategories/{id}/products|get`,
          `/productCategories/{id}/products|post`,
          `/productCategories/{id}/products|put`,
          `/productCategories/{id}/products/{aid}|put`,
          `/productCategories/{id}/products|delete`,
          `/productCategories/{id}/products/{aid}|delete`,
          `/productCategories/{id}/products/count|get`,

          `/productCategories/{id}/tags|get`,
          `/productCategories/{id}/tags|post`,
          `/productCategories/{id}/tags|put`,
          `/productCategories/{id}/tags/{aid}|put`,
          `/productCategories/{id}/tags|delete`,
          `/productCategories/{id}/tags/{aid}|delete`,
          `/productCategories/{id}/tags/count|get`
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
          `/productCategories/{id}/products|get`,
          `/productCategories/{id}/products|post`,
          `/productCategories/{id}/products|put`,
          `/productCategories/{id}/products/{aid}|put`,
          `/productCategories/{id}/products|delete`,
          `/productCategories/{id}/products/{aid}|delete`,
          `/productCategories/{id}/products/count|get`
        ]);

        expect(routes).to.not.include([
          `/productCategories/{id}/tags|get`,
          `/productCategories/{id}/tags|post`,
          `/productCategories/{id}/tags|put`,
          `/productCategories/{id}/tags/{aid}|put`,
          `/productCategories/{id}/tags|delete`,
          `/productCategories/{id}/tags/{aid}|delete`,
          `/productCategories/{id}/tags/count|get`
        ]);
      });
  });

  it('should be able to deactivate an individual route for an individual model association', () => {
    internals.writeController({
      associations: {
        tags: {
          destroy: false,
          destroyMany: false
        }
      }
    });

    return server.register([internals.plugin()])
      .then(() => {
        const routes = routesToStrings(server);

        expect(routes).to.include([
          `/productCategories/{id}/products|get`,
          `/productCategories/{id}/products|post`,
          `/productCategories/{id}/products|put`,
          `/productCategories/{id}/products/{aid}|put`,
          `/productCategories/{id}/products|delete`,
          `/productCategories/{id}/products/{aid}|delete`,
          `/productCategories/{id}/products/count|get`,
          `/productCategories/{id}/tags|get`,
          `/productCategories/{id}/tags|post`,
          `/productCategories/{id}/tags|put`,
          `/productCategories/{id}/tags/{aid}|put`,
          `/productCategories/{id}/tags/count|get`
        ]);

        expect(routes).to.not.include([
          `/productCategories/{id}/tags|delete`,
          `/productCategories/{id}/tags/{aid}|delete`
        ]);
      });
  });

  it('should be able to deactivate an individual route for all model associations', () => {

    internals.writeController({
      associations: {
        '*': {
          destroy: false
        }
      }
    }, false, true);

    return server.register([internals.plugin()])
      .then(() => {
        const routes = routesToStrings(server);

        routes.forEach(r => {
          expect(r).to.not.endWith('{aid}|delete');
        })
      });
  });

  it('should be able to override individual controller logic for an individual model association', () => {
    internals.writeController('{ associations: { tags: { count: { handler: function(server, reply) { reply({ count: null }); } } } } }');

    return server.register([internals.plugin()])
      .then(() => {
        return server.inject({ url: '/productCategories/1/tags/count' });
      })
      .then(res => {
        const data = JSON.parse(res.payload);

        expect(res.statusCode).to.equal(HttpStatus.OK);
        expect(data).to.be.an.object();
        expect(data.count).to.be.null();
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


  it('should be able to provide a pre-resolved model using a pre-handler', () => {
    internals.writeController('{ get: { config: { pre: [ { method: function(request, reply) { '
                                + 'request.server.plugins[\'hapi-sequelize\'].db.sequelize.models.productCategory.findById(2).then(model => reply(model)); }, '
                                + 'assign: \'model\' } ] } } }');


    const ProductCategory = db.models.productCategory;
    let testCats;

    return Promise.all([
      ProductCategory.create(Mocks.productCategory()),
      ProductCategory.create(Mocks.productCategory())
    ])
    .then(instances => {
      testCats = instances;

      return server.register([internals.plugin()]);
    })
    .then(() => {
      return server.inject({ url: '/productCategories/1' });
    })
    .then(res => {
      const data = JSON.parse(res.payload);

      expect(res.statusCode).to.equal(HttpStatus.OK);
      expect(data).to.be.an.object()
                  .and.to.deep.equal(testCats[1].toJSON());
    });
  });

  it('should be able to provide a model scope via a pre-handler to use in query', () => {
    internals.writeController('{ index: { config: { pre: [ { method: function(request, reply) { '
                                + ' reply(\'roots\'); }, '
                                + 'assign: \'scope\' } ] } } }');


    const ProductCategory = db.models.productCategory;

    const cat = Mocks.productCategory();
    cat.rootCategory = false;

    let testCats;

    return Promise.all([
      ProductCategory.create(Mocks.productCategory()),
      ProductCategory.create(cat)
    ])
    .then(instances => {
      testCats = instances;

      return server.register([internals.plugin()]);
    })
    .then(() => {
      return server.inject({ url: '/productCategories' });
    })
    .then(res => {
      const data = JSON.parse(res.payload);

      expect(res.statusCode).to.equal(HttpStatus.OK);
      expect(data).to.be.an.array()
                  .and.to.only.deep.include(testCats[0].toJSON());
    });
  });
});
