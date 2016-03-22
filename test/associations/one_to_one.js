'use strict';

require('babel-polyfill');

const Code = require('code');
const Hapi = require('hapi');
const Hoek = require('hoek');
const HttpStatus = require('http-status-codes');
const Lab = require('lab');
const Mocks = require('../helpers/mocks');
const QS = require('qs');

const snakeCase = require('snake-case');
const lab = exports.lab = Lab.script();
const expect = Code.expect;
const before = lab.before;
const describe = lab.describe;
const it = lab.it;

describe('hapi-sequelize-crud2 one-to-one associations REST interface', () => {
  let server, db, Product, ProductCategory, testProduct, testCategory, baseUrl;

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

    return server.register([plugin, require('../../build')])
      .then(() => {
        db = server.plugins['hapi-sequelize'].db.sequelize;
        Product = db.models.product;
        ProductCategory = db.models.productCategory;

        return db.sync({ force: true });
      })
      .then(() => {
        return Promise.all([
          Product.create(Mocks.product()),
          ProductCategory.create(Mocks.productCategory())
        ]);
      })
      .then(models => {
        testProduct = models[0];
        testCategory = models[1];
        baseUrl = `/${Product.options.name.plural}/${testProduct.id}/${ProductCategory.options.name.singular}`;

        testProduct.setProductCategory(testCategory);
      });
  });

  it('should retrieve an associated model', () => {
    return server.inject({ url: baseUrl })
      .then(res => {
        const data = JSON.parse(res.payload);
      	const expected = testCategory.toJSON();

      	expect(res.statusCode).to.equal(HttpStatus.OK);
      	expect(data).to.be.an.object()
                        .and.to.only.deep.include(expected)
        ;
    	});
  });

  it('should create a new associated model and set the association on the parent model', () => {
    let categoryId;

    return server.inject({ url: baseUrl, method: 'POST', payload: Mocks.productCategory() })
      .then(res => {
        const data = JSON.parse(res.payload);

        expect(res.statusCode).to.equal(HttpStatus.OK);
        expect(data).to.be.an.object()
                          .and.to.include('productCategoryId');

        categoryId = data.productCategoryId;
        expect(categoryId).to.not.equal(testProduct.productCategoryId);

        return testProduct.reload();
      })
      .then(() => {
        return testProduct.getProductCategory();
      })
      .then(result => {
        expect(result.id).to.equal(categoryId);
      });
  });

  it('should set the model association', () => {
    let category;

    return ProductCategory.create(Mocks.productCategory())
      .then(result => {
        category = result;

        return server.inject({ url: `${baseUrl}/${category.id}`, method: 'PUT' });
      })
      .then(res => {
        expect(res.statusCode).to.equal(HttpStatus.OK);

        return testProduct.reload();
      })
      .then(res => {
        return testProduct.getProductCategory();
      })
      .then(result => {
        expect(result.toJSON()).to.deep.equal(category.toJSON());
      });
  });

  it('should unset the model association', () => {
    return server.inject({ url: baseUrl, method: 'DELETE' })
      .then(res => {
        expect(res.statusCode).to.equal(HttpStatus.OK);

        return testProduct.reload();
      })
      .then(res => {
        return testProduct.getProductCategory();
      })
      .then(res => {
        expect(res).to.be.null();
      });
  });
});
