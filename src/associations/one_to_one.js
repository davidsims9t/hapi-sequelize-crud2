import Boom from 'boom';
import Hoek from 'hoek';
import Joi from 'joi';
import error from '../error';
import { queryParams, validation } from '../helpers'

let prefix;

const defaultHandlerOptions = {
  index: true,
  create: true,
  update: true,
  destroy: true
};

const methods = {};

export default (server, model, association, options) => {
  prefix = options.prefix;

  const handlerOptions = Hoek.applyToDefaults(defaultHandlerOptions, options.handlerOptions);

  for (const method in methods) {
    let methodOpts = handlerOptions[method];

    if (!! methodOpts) {
      methodOpts = typeof methodOpts === 'object' ? methodOpts : {};

      methods[method](server, model, association, methodOpts);
    }
  }
};

export const index = methods.index = (server, model, association, options) => {
  const route = Hoek.applyToDefaults({
    method: 'GET',
    path: `${prefix}/${model._plural}/{aid}/${association._singular}`,

    @error
    async handler(request, reply) {
      const instance = await model.findById(request.params.aid);

      if (!instance) {
        return reply(Boom.notFound());
      }

      const { include } = queryParams(server, request);

      const result = await instance[association.accessors.get]({ include });

      reply(result);
    }
  }, options);

  server.route(route);
};

export const create = methods.create = (server, model, association, options) => {
  const route = Hoek.applyToDefaults({
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
  }, options);

  server.route(route);
};

export const update = methods.update = (server, model, association, options) => {
  const route = Hoek.applyToDefaults({
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
  }, options);

  server.route(route);
};

export const destroy = methods.destroy = (server, model, association, options) => {
  const route = Hoek.applyToDefaults({
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
  }, options);

  server.route(route);
};
