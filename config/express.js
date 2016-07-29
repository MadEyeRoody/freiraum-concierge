/**
 * Copyright 2014 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

// Module dependencies
var express    = require('express'),
  errorhandler = require('errorhandler'),
  bodyParser   = require('body-parser'),
  auth         = require('http-auth');

module.exports = function (app) {

  // Configure Express
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());

  // Setup static public directory
  app.use(express.static(__dirname + '/../public'));

  var provided_username = process.env.BASICAUTH_USERNAME,
      provided_password = process.env.BASICAUTH_PASSWORD;

  // Add error handling and default passwords for local dev
  if (!process.env.VCAP_SERVICES) {
    app.use(errorhandler());
    provided_username = 'username';
    provided_password = 'password';
  }

  var basicauth = auth.basic({
    realm: 'Freecon Admin'
  },function (username, password, callback) {
      callback(username === provided_username && password === provided_password);
    }
  );

  // When running in Bluemix add rate-limitation
  // and some other features around security
  if (process.env.VCAP_APPLICATION){
    require('./security')(app);
  }

  app.use('/admin', auth.connect(basicauth), express.static(__dirname + '/../admin'));

};
