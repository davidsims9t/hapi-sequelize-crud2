import Boom from 'boom';
import Joi from 'joi';
import error from '../error';
import { queryParams, validation } from '../helpers'

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
      const instance = await model.findById(request.params.aid);

      if (!instance) {
        return reply(Boom.notFound());
      }

      const { include } = queryParams(request)

      const result = await instance[association.accessors.get]({ include });

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
      const instance = await model.findById(request.params.aid);

      if (!instance) {
        return reply(Boom.notFound());
      }

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

      if (!instance) {
        return reply(Boom.notFound());
      }

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

      if (!instance) {
        return reply(Boom.notFound());
      }

      const result = await instanceA[association.accessor.set](null);

      reply(result);
    }
  })
}
