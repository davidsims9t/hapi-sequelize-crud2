import joi from 'joi';
import error from '../error';
import _ from 'lodash';

let prefix, scopePrefix;

export default (server, model, association, options) => {
  prefix = options.prefix;
  scopePrefix = options.scopePrefix;

  index(server, model, association);
  create(server, model, association);
  add(server, model, association);
  addMany(server, model, association);
  destroy(server, model, association);
  destroyMany(server, model, association);
}

export const index = (server, model, association) => {
  server.route({
    method: 'GET',
    path: `${prefix}/${model._plural}/{aid}/${association._plural}`,

    @error
    async handler(request, reply) {
      let include = [];
      if (request.query.include)
        include = [request.models[request.query.include]];

      const instance = await model.findById(request.params.aid);
      const where = _.omit(request.query, 'include');
      const result = await instance[association.accessors.get]({
        where,
        include
      });

      reply(result);
    }
  })
}

export const create = (server, model, association) => {
  server.route({
    method: 'POST',
    path: `${prefix}/${model._plural}/{id}/${association._plural}`,

    @error
    async handler(request, reply) {
      const instance = await model.findById(request.params.id);
      const result = await instance[association.accessors.create](request.payload);

      reply(result);
    }
  })
}

export const add = (server, model, association) => {
  server.route({
    method: 'PUT',
    path: `${prefix}/${model._plural}/{aid}/${association._plural}/{bid}`,

    @error
    async handler(request, reply) {
      const instance = await model.findById(request.params.aid);
      const result = await instance[association.accessor.add](request.params.bid);

      reply(result);
    }
  })
}

export const addMany = (server, model, association) => {
  server.route({
    method: 'PUT',
    path: `${prefix}/${model._plural}/{aid}/${association._plural}`,

    @error
    async handler(request, reply) {
      const instance = await model.findById(request.params.aid);
      const result = await instance[association.accessor.add](request.query.id);

      reply(result);

      reply(list);
    },

    config: {
      validate: {
        query: {
          id: joi.array().items(joi.number().integer()).required()
        }
      }
    }
  })
}

export const destroy = (server, model, association) => {
  server.route({
    method: 'DELETE',
    path: `${prefix}/${model._plural}/{aid}/${association._plural}/{bid}`,

    @error
    async handler(request, reply) {
      const instance = await model.findById(request.params.aid);

      const result = await instance[association.accessors.remove](request.params.bid);

      reply(result);
    }
  })
}

export const destroyMany = (server, model, association) => {
  server.route({
    method: 'DELETE',
    path: `${prefix}/${model._plural}/{aid}/${association._plural}`,

    @error
    async handler(request, reply) {
      const instance = await model.findById(request.params.aid);
      const ids = request.query.id;
      const destroyMethod = ids ? 'removeMultiple' : 'set';

      const result = await instance[association.accessors[destroyMethod]](ids);

      reply(result);
    },

    config: {
      validate: {
        query: {
          id: joi.array().items(joi.number().integer()).optional()
        }
      }
    }
  })
}
