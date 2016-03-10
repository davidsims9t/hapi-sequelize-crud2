'use strict';

const randomInt = () => {
  return Math.floor(Math.random() * 100);
}

exports.product = {
  name: `test product ${randomInt()}`,
  inventory: randomInt()
};

exports.category = {
  name: `test category ${randomInt()}`,
  rootCategory: true
};
