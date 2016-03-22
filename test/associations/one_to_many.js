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

const internals = {};

internals.removePivot = (i) => {
  delete i.productTag;
  return i;
};

describe('hapi-sequelize-crud2 one-to-many associations REST interface', () => {
  let server, db, Product, Tag, testProduct, testTags, baseUrl;

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
        Tag = db.models.tag;

        return db.sync({ force: true });
      })
      .then(() => {
        return Promise.all([
          Product.create(Mocks.product()),
          Tag.create(Mocks.tag()),
          Tag.create(Mocks.tag()),
          Tag.create(Mocks.tag()),
        ]);
      })
      .then(models => {
        testProduct = models[0];
        testTags = models.slice(1, 4);
        baseUrl = `/${Product.options.name.plural}/${testProduct.id}/${Tag.options.name.plural}`;

        testProduct.setTags(testTags);
      });
  });

  it('should retrieve associated models', () => {
    return server.inject({ url: baseUrl })
      .then(res => {
        const data = JSON.parse(res.payload).map(internals.removePivot);
      	const expected = testTags.map(i => i.toJSON());

      	expect(res.statusCode).to.equal(HttpStatus.OK);
      	expect(data).to.be.an.array()
                        .and.to.only.deep.include(expected)
        ;
    	});
  });

  it('should return a count of associated models', () => {
      return server.inject({ url: `${baseUrl}/count` })
        .then(res => {
          const data = JSON.parse(res.payload);

          expect(res.statusCode).to.equal(HttpStatus.OK);
          expect(data).to.be.an.object()
                      .and.deep.equal({ count: testTags.length });
        });
  });

  it('should create a new associated model and add it to the associations on the parent model', () => {
    const tagData = Mocks.tag();

    let tag;

    return server.inject({ url: baseUrl, method: 'POST', payload: tagData })
      .then(res => {
        const data = JSON.parse(res.payload);

        expect(res.statusCode).to.equal(HttpStatus.OK);

        expect(data).to.be.an.object()
                          .and.to.include(tagData)
                          .and.to.include('id');

        return Tag.findById(data.id);
      })
      .then(result => {
        expect(result).to.be.an.object();
        expect(result.name).to.equal(tagData.name);

        tag = result;
        testTags.push(tag);

        return testProduct.reload();
      })
      .then(() => {
        return testProduct.getTags();
      })
      .then(results => {
        const resultsSimple = results.map(i => i.toJSON()).map(internals.removePivot);
        const expected = testTags.map(i => i.toJSON());

        expect(resultsSimple).to.be.an.array()
                             .and.to.only.deep.include(expected);
      });
  });

  it('should add a single associated model to the model association', () => {
    let tag;

    return Tag.create(Mocks.tag())
      .then(result => {
        tag = result;

        return server.inject({ url: `${baseUrl}/${tag.id}`, method: 'PUT' });
      })
      .then(res => {
        expect(res.statusCode).to.equal(HttpStatus.OK);

        return testProduct.reload();
      })
      .then(() => {
        return testProduct.getTags();
      })
      .then(results => {
        const resultsSimple = results.map(i => i.toJSON()).map(internals.removePivot);
        const expected = testTags.map(i => i.toJSON());
        expected.push(tag.toJSON());

        expect(resultsSimple).to.be.an.array()
                             .and.to.only.deep.include(expected);
      });
  });

  it('should unset all model associations', () => {
    return server.inject({ url: baseUrl, method: 'DELETE' })
      .then(res => {
        expect(res.statusCode).to.equal(HttpStatus.OK);

        return testProduct.reload();
      })
      .then(() => {
        return testProduct.getTags();
      })
      .then(res => {
        expect(res).to.be.empty();
      });
  });

  it('should add many associated models to the model association', () => {
    const tags = testTags.slice(1, 3);
    const ids = tags.reduce((obj, t) => {
      obj.id.push(t.id);
      return obj;
    }, { id: [] });
    const querystring = QS.stringify(ids);

    return server.inject({ url: `${baseUrl}?${querystring}`, method: 'PUT' })
      .then(res => {
        expect(res.statusCode).to.equal(HttpStatus.OK);

        return testProduct.reload();
      })
      .then(() => {
        return testProduct.getTags();
      })
      .then(results => {
        const resultsSimple = results.map(i => i.toJSON()).map(internals.removePivot);
        const expected = tags.map(i => i.toJSON());

        expect(resultsSimple).to.be.an.array()
                             .and.to.only.deep.include(expected);

        testTags = tags;
      });
  });

  it('should unset a single model association', () => {
    const tag = testTags[0];

    return server.inject({ url: `${baseUrl}/${tag.id}`, method: 'DELETE' })
      .then(res => {
        expect(res.statusCode).to.equal(HttpStatus.OK);

        return testProduct.getTags();
      })
      .then(results => {
        const resultsSimple = results.map(i => i.toJSON()).map(internals.removePivot);
        const expected = tag.toJSON();

        expect(resultsSimple).to.be.an.array()
                             .and.to.not.deep.include(expected);
      });
  });
});
