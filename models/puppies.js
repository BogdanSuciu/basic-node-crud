const crud = require('../services/crud');
const each = require('lodash/each');

const puppiesProcessors = {
  create: {
    age: function(age) {
      return parseInt(age);
    }
  },
  update: {
    age: function(age) {
      return parseInt(age);
    },
    id: function(id) {
      return parseInt(id);
    }
  }
};

function createCrud(router) {
  const puppies = crud.crudCreator('puppies', puppiesProcessors);
  each(puppies, (endPoint) => {
    crud.endPointCreator(endPoint, router);
  });
}

module.exports = {
  createCrud: createCrud
}
