'use strict';

require('babel-polyfill');

const Code = require('code');
const Hapi = require('hapi');
const HttpStatus = require('http-status-codes');
const Lab = require('lab');

const mocks = require('./mocks');
const snakeCase = require('snake-case');
const lab = exports.lab = Lab.script();
const expect = Code.expect;
const before = lab.before;
const beforeEach = lab.beforeEach;
const afterEach = lab.afterEach;
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
        models: 'test/models/**/*.js',
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
      });
  });

  it('should retrieve a list of models', () => {
  	return server.inject({ url: baseUrl })
    	.then(res => {
      	expect(res.statusCode).to.equal(200);

      	const data = JSON.parse(res.payload)
      	, expected = instances.map(i => i.toJSON());

      	expect(data).to.be.an.array();
      	expect(data).to.only.deep.include(expected);
    	});
  });

  it('should filter the retrieved list of models by given querystring parameters', () => {

  });

  it('should restrict the retrieved list of models by given offset and limit parameters', () => {

  });

  it('should retrieve a count of models', () => {
    return server.inject({ url: `${baseUrl}/count` })
      .then(res => {
         expect(res.statusCode).to.equal(HttpStatus.OK);

         const data = JSON.parse(res.payload);
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

  });

  it('should retrieve a list of models by defined scope', () => {
    return server.inject({ url: `${baseUrl}/s/outOfStock` })
      .then(res => {
        expect(res.statusCode).to.equal(HttpStatus.OK);

        const data = JSON.parse(res.payload)
        , expected = instances.filter(i => i.inventory === 0)
                              .map(i => i.toJSON())
        ;

        expect(data).to.be.an.array()
                    .and.to.only.deep.include(expected)
        ;
      });
  });

  it('should return a Bad Request error for undefined scope', {} => {
    return server.inject({ url: `${baseUrl}/s/lies` })
      .then(res => {
        expect(res.statusCode).to.equal(HttpStatus.BAD_REQUEST);
      });
  });

  it('should create a single new model instance', () => {
    const newAttributes = {
      name: 'new product test',
      inventory: 42
    };

    let data;

    return server.inject({ url: baseUrl, method: 'POST', payload: newAttributes })
      .then(res => {
        expect(res.statusCode).to.equal(HttpStatus.OK);

        data = JSON.parse(res.payload);

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
        expect(res.statusCode).to.equal(HttpStatus.OK);

        data = JSON.parse(res.payload);
        console.log(data);

        return Product.findById(instance.id);
      })
      .then(instance => {
        expect(instance).to.be.null();

        return server.inject({ url: `${baseUrl}/${instance.id}` });
      }).then(res => {
        expect(res.statusCode).to.equal(HttpStatus.NOT_FOUND);
      });
  });
});
