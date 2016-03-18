import Boom from 'boom';
import ControllerManager from '../controller_manager';
import Hoek from 'hoek';
import Joi from 'joi';
import error from '../error';
import { getModel, queryParams, validation } from '../helpers'

let prefix;

const methods = {};

export default (server, model, association, options) => {
  prefix = options.prefix;

  const asscOptions = ControllerManager.pluckAssociationOptions(
                        options.controllerOptions,
                        association._plural
                      );

  for (const method in methods) {
    let methodOpts = asscOptions[method];

    if (!! methodOpts) {
      methodOpts = typeof methodOpts === 'object' ? methodOpts : {};

      methods[method](server, model, association, methodOpts);
    }
  }
};

export const index = methods.index = (server, model, association, options) => {
  const route = Hoek.applyToDefaults({
    method: 'GET',
    path: `${prefix}/${model._plural}/{id}/${association._singular}`,

    @error
    async handler(request, reply) {
      const instance = await getModel(request, model);

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
      const instance = await getModel(request, model);

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
    path: `${prefix}/${model._plural}/{id}/${association._singular}/{aid}`,

    @error
    async handler(request, reply) {
      const instance = await getModel(request, model);

      if (!instance) {
        return reply(Boom.notFound());
      }

      const result = await instance[association.accessors.set](request.params.aid);

      reply(result);
    }
  }, options);

  server.route(route);
};

export const destroy = methods.destroy = (server, model, association, options) => {
  const route = Hoek.applyToDefaults({
    method: 'DELETE',
    path: `${prefix}/${model._plural}/{id}/${association._singular}`,

    @error
    async handler(request, reply) {
      const instance = await getModel(request, model);

      if (!instance) {
        return reply(Boom.notFound());
      }

      const result = await instance[association.accessors.set](null);

      reply(result);
    }
  }, options);

  server.route(route);
};
