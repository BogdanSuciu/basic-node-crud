const express = require('express');
const promise = require('bluebird');
const each = require('lodash/each');
const dbConfig = require('../config/dbConfig');


const options = {
  // Initialization Options
  promiseLib: promise
};

const pgp = require('pg-promise')(options);
const db = pgp(dbConfig);

function getAll(table, processors) {
  return function (req, res, next) {
    db.any('select * from ' + table)
      .then(function (data) {
        if(processors) {
          each(data,(items) => {
            each(items, (property,key) => {
              if(processors[key]) {
                items[key] = processors[key](property);
              }
            });
          });
        }
        res.status(200)
          .json({
            data: data
          });
      })
      .catch(function (err) {
        return next(err);
      });
  }
}

function getSingle(table, processors) {
  return function (req, res, next) {
    const id = parseInt(req.params.id);
    db.one('select * from '+ table + ' where id = $1', id)
      .then(function (data) {
        if(processors) {
          each(data, (property, key) => {
            if(processors[key]) {
              data[key] = processors[key](property);
            }
          });
        }
        res.status(200)
          .json({
            data: data
          });
      })
      .catch(function (err) {
        return next(err);
      });
  }
}

function create(table, processors) {
  return function(req, res, next) {
    const columns = [];
    const values = [];

    each(req.body, (value, key) => {
      columns.push(key);
      values.push('${' + key + '}');

      if(processors && processors[key]) {
        req.body[key] = processors[key](value);
      }

    });

    db.none('insert into ' + table + '(' + columns.join(',') +')' +
      'values(' + values.join(',') + ' )',
      req.body)
      .then(function () {
        res.status(200)
          .json({
            status: 'success'
          });
      })
      .catch(function (err) {
        console.error(err);
        return next(err);
      });
  };
}

function update(table, processors) {
  return function (req, res, next) {

    const columns = [];
    let paramQueryString = '';
    const values = [];

    let counter = 1;
    each(req.body,(value,key) => {
      columns.push(key + '=$' + counter);
      if(processors && processors[key]) {
        values.push(processors[key](value));
      }
      else {
        values.push(value);
      }
      counter++
    });

    if(req.params && req.params.id) {
      paramQueryString = ' where id=$' + counter;
      if(processors && processors.id) {
        const processedParam = processors.id(req.params.id);
        values.push(processedParam);
      }
      else {
        values.push(req.params.id);
      }
    }

    db.none('update ' + table + ' set ' + columns.join(', ') + paramQueryString,
      values)
      .then(function () {
        res.status(200)
          .json({
            status: 'success'
          });
      })
      .catch(function (err) {
        return next(err);
      });
  };
}

function remove(table) {
  return function(req, res, next) {
    const id = parseInt(req.params.id);
    db.result('delete from ' + table + ' where id = $1', id)
      .then(function () {
        /* jshint ignore:start */
        res.status(200)
          .json({
            status: 'success'
          });
        /* jshint ignore:end */
      })
      .catch(function (err) {
        return next(err);
      });
  }
}

function crudCreator(tableName, bodyProcessors) {
  return [
    { action: 'get', url: '/api/' + tableName, handler: getAll(tableName, bodyProcessors.getAll)},
    { action: 'get', url: '/api/' + tableName + '/:id', handler: getSingle(tableName, bodyProcessors.getSingle) },
    { action: 'post', url: '/api/' + tableName, handler: create(tableName, bodyProcessors.create) },
    { action: 'put', url: '/api/' + tableName + '/:id', handler: update(tableName, bodyProcessors.update) },
    { action: 'delete', url: '/api/' + tableName + '/:id', handler: remove(tableName, bodyProcessors.delete) }
  ]
}

function endPointCreator(endPoint, router) {
  if(endPoint.action && endPoint.url && endPoint.handler) {
    const action = endPoint.action.toLowerCase();
    if(router[action]) {
      router[action](endPoint.url, endPoint.handler);
    }
  }
  else {
    console.error("missing endPoint component in endpoint: ", endPoint);
  }
}

module.exports = {
  crudCreator,
  endPointCreator
};