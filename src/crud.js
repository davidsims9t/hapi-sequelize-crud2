import joi from 'joi';
import boom from 'boom';
import error from './error';
import _ from 'lodash';

let prefix, scopePrefix;

export default (server, model, options) => {
  prefix = options.prefix;
  scopePrefix = options.scopePrefix;

  index(server, model);
  get(server, model);
  scope(server, model);
  create(server, model);
  destroy(server, model);
  update(server, model);
}

export const index = (server, model) => {
  server.route({
    method: 'GET',
    path: `${prefix}/${model._plural}`,

    @error
    async handler(request, reply) {
      if (request.query.include)
        var include = [request.models[request.query.include]];

      let where = _.omit(request.query, 'include');

      for (const key of Object.keys(where)) {
        try {
          where[key] = JSON.parse(where[key]);
        } catch (e) {
          //
        }
      }

      let list = await model.findAll({
        where, include
      });

      reply(list);
    }
  });
}

export const get = (server, model) => {
  server.route({
    method: 'GET',
    path: `${prefix}/${model._plural}/{id}`,

    @error
    async handler(request, reply) {
      if (request.query.include)
        var include = [request.models[request.query.include]];

      let where = _.omit(request.query, 'include');

      for (const key of Object.keys(where)) {
        try {
          where[key] = JSON.parse(where[key]);
        } catch (e) {
          //
        }
      }

      let instance = await model.findById(request.params.id, { where, include });

      if (!instance) {
        reply(boom.notFound())
      }

      reply(instance);
    },
    config: {
      validate: {
        params: {
          id: joi.number().integer()
        }
      }
    }
  })
}

export const scope = (server, model) => {
  let scopes = Object.keys(model.options.scopes);

  server.route({
    method: 'GET',
    path: `${prefix}/${model._plural}/${scopePrefix}/{scope}`,

    @error
    async handler(request, reply) {
      if (request.query.include)
        var include = [request.models[request.query.include]];

      let where = _.omit(request.query, 'include');

      for (const key of Object.keys(where)) {
        try {
          where[key] = JSON.parse(where[key]);
        } catch (e) {
          //
        }
      }

      const list = await model.scope(request.params.scope).findAll({ include, where });

      reply(list);
    },
    config: {
      validate: {
        params: {
          scope: joi.string().valid(...scopes)
        }
      }
    }
  });
}

export const create = (server, model) => {
  server.route({
    method: 'POST',
    path: `${prefix}/${model._plural}`,

    @error
    async handler(request, reply) {
      const instance = await model.create(request.payload);

      reply(instance);
    }
  })
}

export const update = (server, model) => {
  server.route({
    method: 'PUT',
    path: `${prefix}/${model._plural}/{id}`,

    @error
    async handler(request, reply) {
      const instance = await model.findById(request.params.id);

      if (!instance) {
        reply(boom.notFound());
      }

      const result = await instance.update(request.payload);

      reply(result);
    },
    config: {
      validate: {
        params: {
          id: joi.number().integer()
        }
      }
    }
  })
}

export const destroy = (server, model) => {
  server.route({
    method: 'DELETE',
    path: `${prefix}/${model._plural}/{id}`,

    @error
    async handler(request, reply) {
      const instance = await model.findById(request.params.id);

      if (!instance) {
        reply(boom.notFound());
      }

      const result = await instance.destroy();

      reply(result);
    },
    config: {
      validate: {
        params: {
          id: joi.number().integer()
        }
      }
    }
  })
}

import * as associations from './associations/index';
export { associations };
