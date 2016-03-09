import joi from 'joi';
import error from '../error';
import _ from 'lodash';

let prefix;

export default (server, model, association, options) => {
  prefix = options.prefix;

  index(server, model, association);
  create(server, model, association);
  set(server, model, association);
  destroy(server, model, association);
}

export const index = (server, model, association) => {
  server.route({
    method: 'GET',
    path: `${prefix}/${model._plural}/{aid}/${association._singular}`,

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
    path: `${prefix}/${model._plural}/{id}/${association._singular}`,

    @error
    async handler(request, reply) {
      const instance = await model.findById(request.params.id);
      const result = await instance[association.accessors.create](request.payload);

      reply(result);
    }
  })
}

export const set = (server, model, association) => {
  server.route({
    method: 'PUT',
    path: `${prefix}/${model._plural}/{aid}/${association._singular}/{bid}`,

    @error
    async handler(request, reply) {
      const instance = await model.findById(request.params.aid);
      const result = await instance[association.accessor.set](request.params.bid);
        
      reply(result);
    }
  })
}

export const destroy = (server, model, association) => {
  server.route({
    method: 'DELETE',
    path: `${prefix}/${model._plural}/{aid}/${association._singular}`,

    @error
    async handler(request, reply) {
      const instance = await model.findById(request.params.aid);
      const result = await instanceA[association.accessor.set](null);

      reply(result);
    }
  })
}