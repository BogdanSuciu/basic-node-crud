const express = require('express');
const router = express.Router();
const puppies = require('../models/puppies');

puppies.createCrud(router);

module.exports = router;