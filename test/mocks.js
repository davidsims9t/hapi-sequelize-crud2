'use strict';

const randomInt = () => {
  return Math.floor(Math.random() * 100);
}

exports.product = () => {
  return {
    name: `test product ${randomInt()}`,
    inventory: randomInt(),
    productCategoryId: null
  };
};

exports.productCategory = () => {
  return {
    name: `test category ${randomInt()}`,
    rootCategory: true
  };
};
