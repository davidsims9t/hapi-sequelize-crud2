'use strict';

require('babel-polyfill');

const Code = require('code');
const Hapi = require('hapi');
const Hoek = require('hoek');
const HttpStatus = require('http-status-codes');
const Lab = require('lab');
const Mocks = require('./helpers/mocks');
const QS = require('qs');

const snakeCase = require('snake-case');
const lab = exports.lab = Lab.script();
const expect = Code.expect;
const before = lab.before;
const describe = lab.describe;
const it = lab.it;

describe('hapi-sequelize-crud2 CRUD REST interface', () => {
  let server, db, Product, instances, instance, baseUrl;

  before({ timeout: 5000 }, () => {
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

    return server.register([plugin, require('../build')])
      .then(() => {
        db = server.plugins['hapi-sequelize'].db.sequelize;
        Product = db.models.product;
        baseUrl = `/${Product.options.name.plural}`;

        return db.sync({ force: true });
      })
      .then(() => {
        const ProductCategory = db.models.productCategory;

        return Promise.all([
          Product.create(Mocks.product()),
          Product.create(Mocks.product()),
          Product.create(Hoek.applyToDefaults(Mocks.product(), { inventory: 0 })),
          ProductCategory.create(Mocks.productCategory())
        ]);
      })
      .then(models => {
        instances = models.slice(0, 3);
        instance = instances[0];
        instance.setProductCategory(models[3]);
      });
  });

  it('should retrieve a list of models', () => {
    return server.inject({ url: baseUrl })
      .then(res => {
        const data = JSON.parse(res.payload);
        const expected = instances.map(i => i.toJSON());

      	expect(res.statusCode).to.equal(HttpStatus.OK);
        expect(data).to.be.an.array();
        expect(data).to.only.deep.include(expected);
    	});
  });

  it('should filter the retrieved list of models by given querystring parameters', () => {
    const params = {
      filter: {
        inventory: instance.inventory
      }
    };

    const querystring = QS.stringify(params);

    let data;

    return server.inject({ url: `${baseUrl}?${querystring}` })
      .then(res => {
        data = JSON.parse(res.payload);

        expect(res.statusCode).to.equal(HttpStatus.OK);

        return Product.findAll({ where: params.filter });
      })
      .then(results => {
        expect(results).to.be.an.array();

        const expected = results.map(i => i.toJSON());

        expect(data).to.only.deep.include(expected);
      });
  });

  it('should restrict the retrieved list of models by given offset and limit parameters', () => {
    const offset = 2,
      limit = 1;

    return server.inject({ url: `${baseUrl}?offset=${offset}&limit=${limit}` })
      .then(res => {
        expect(res.statusCode).to.equal(HttpStatus.OK);

        const data = JSON.parse(res.payload),
          startIndex = offset,
          endIndex = startIndex + limit,
          expected = instances.slice(startIndex, endIndex).map(i => i.toJSON());

        expect(data).to.be.an.array();
        expect(data).to.only.deep.include(expected);
      });
  });

  it('should not allow limits of more than 100', () => {
    const limit = 1000;

    return server.inject({ url: `${baseUrl}?limit=${limit}` })
      .then(res => {
        expect(res.statusCode).to.equal(HttpStatus.BAD_REQUEST);
      });
  });

  it('should retrieve a count of models', () => {
    return server.inject({ url: `${baseUrl}/count` })
      .then(res => {
        const data = JSON.parse(res.payload);

        expect(res.statusCode).to.equal(HttpStatus.OK);
        expect(data).to.be.an.object();
        expect(data).to.deep.equal({ count: instances.length });
      });
  });

  it('should retrieve a single model by ID', () => {
    const model = instances[0];

    return server.inject({ url: `${baseUrl}/${model.id}` })
      .then(res => {
        expect(res.statusCode).to.equal(HttpStatus.OK);

        const data = JSON.parse(res.payload);
        expect(data).to.be.an.object();
        expect(data).to.deep.equal(model.get());
      });
  });

  it('should include given related models with a single instance', () => {
    const model = instances[0];

    let related;

    return model.getProductCategory()
      .then(result => {
        related = result;

        return server.inject({ url: `${baseUrl}/${model.id}?include=productCategory` });
      })
      .then(res => {
        const data = JSON.parse(res.payload);
        const expected = Object.assign(model.get(), { productCategory: related.get() });

        expect(res.statusCode).to.equal(HttpStatus.OK);
        expect(data).to.be.an.object();
        expect(data).to.deep.equal(expected);
      });
  });

  it('should retrieve a list of models by defined scope', () => {
    return server.inject({ url: `${baseUrl}/s/outOfStock` })
      .then(res => {
        const data = JSON.parse(res.payload);
        const expected = instances.filter(i => i.inventory === 0)
                                  .map(i => i.toJSON())
        ;

        expect(res.statusCode).to.equal(HttpStatus.OK);
        expect(data).to.be.an.array()
                    .and.to.only.deep.include(expected)
        ;
      });
  });

  it('should return a Bad Request error for undefined scope', () => {
    return server.inject({ url: `${baseUrl}/s/lies` })
      .then(res => {
        expect(res.statusCode).to.equal(HttpStatus.BAD_REQUEST);
      });
  });

  it('should create a single new model instance', () => {
    let data;

    return server.inject({ url: baseUrl, method: 'POST', payload: Mocks.product() })
      .then(res => {
        data = JSON.parse(res.payload);

        expect(res.statusCode).to.equal(HttpStatus.OK);
        expect(data).to.be.an.object()
                    .and.to.include('id');

        return Product.findById(data.id);

      })
      .then(newInstance => {
        expect(data).to.deep.equal(newInstance.get());

        instance = newInstance;
      });
  });

  it('should update a single existing model instance', () => {
    const updateAttributes = { inventory: 11 };
    let data;

    return server.inject({ url: `${baseUrl}/${instance.id}`, method: 'PUT', payload: updateAttributes })
      .then(res => {
        expect(res.statusCode).to.equal(HttpStatus.OK);

        data = JSON.parse(res.payload);
        expect(data).to.be.an.object()
                    .and.to.include(updateAttributes);

        return Product.findById(data.id);
      })
      .then(newInstance => {
        const expected = Object.assign(instance.get(), updateAttributes);

        expect(data).to.deep.equal(newInstance.get());
        expect(newInstance.get()).to.deep.equal(expected);

        instance = newInstance;
      });
  });

  it('should destroy a single model instance', () => {
    return server.inject({ url: `${baseUrl}/${instance.id}`, method: 'DELETE'})
      .then(res => {
        const data = JSON.parse(res.payload);

        expect(res.statusCode).to.equal(HttpStatus.OK);

        return Product.findById(instance.id);
      })
      .then(oldInstance => {
        expect(oldInstance).to.be.null();

        return server.inject({ url: `${baseUrl}/${instance.id}` });
      }).then(res => {
        expect(res.statusCode).to.equal(HttpStatus.NOT_FOUND);
      });
  });
});
