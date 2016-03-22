'use strict';

const Code = require('code');
const Hapi = require('hapi');
const Lab = require('lab');
const Helpers = require('../build/helpers');

const lab = exports.lab = Lab.script();
const expect = Code.expect;
const describe = lab.describe;
const it = lab.it;

describe('hapi-sequelize-crud2 helper', () => {

  it('`prepareScopes` should flatten and filter null scopes', (done) => {
    const scopes = [['scope1', undefined, { method: 'scope2' }], 'scope3'];
    const prepared = Helpers.prepareScopes(scopes);

    expect(prepared).to.only.deep.include([scopes[0][0], scopes[0][2], scopes[1]]);

    done();
  });
});
