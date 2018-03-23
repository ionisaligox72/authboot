const bcrypt = require('bcrypt');
const authMiddleware = require('express-basic-auth-safe');
const debug = require('diagnostics')('authboot');

module.exports = function (opts = {}) {
  return function (app, options = {}, callback) {
    const users = new Map(
      Object.entries(opts.users
        || options.users
        || app.config.get('auth:users')
        || {}
      )
    );

    const realm = opts.realm
      || options.realm
      || app.config.get('auth:realm');

    const challenge = opts.challenge
      || options.challenge
      || app.config.get('auth:challenge');

    const unauthorizedResponse = opts.unauthorizedResponse
      || options.unauthorizedResponse
      || app.config.get('auth:unauthorizedResponse')
      || { error: 'Not authorized' };

    const lookupOpt = typeof opts.lookup === 'function' ? opts.lookup : null;

    if (challenge && !realm) {
      return callback(new Error('authboot requires a specified realm if a challenge request will be sent.'));
    }

    if (!users.size && !lookupOpt) {
      return callback(new Error('authboot requires custom lookup function or users object for authentication'));
    }

    app.authboot = {};
    const lookup = app.authboot.lookup = (lookupOpt || function ({ name, password }, callback) {
      const hash = users.get(name);
      if (!hash) {
        debug(`unknown username ${name}`);
        return callback(null, false);
      }
      bcrypt.compare(password, hash, callback);
    });

    app.authboot.middleware = authMiddleware({
      authorizer: (name, password, cb) => lookup({ name, password }, cb),
      unauthorizedResponse,
      authorizeAsync: true,
      challenge,
      realm
    });

    callback();
  };
};
