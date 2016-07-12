/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
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

var express  = require('express'),
  app        = express(),
  fs         = require('fs'),
  path       = require('path'),
  bluemix    = require('./config/bluemix'),
  extend     = require('util')._extend,
  watson     = require('watson-developer-cloud');

// Bootstrap application settings
require('./config/express')(app);

// if bluemix credentials exists, then override local
var credentials =  extend({
  url: '<url>',
  username: '<username>',
  password: '<password>',
  version: 'v1'
}, bluemix.getServiceCreds('dialog')); // VCAP_SERVICES

var dialog_id_in_json = (function() {
  try {
    var dialogsFile = path.join(path.dirname(__filename), 'dialogs', 'dialog-id.json');
    var obj = JSON.parse(fs.readFileSync(dialogsFile));
    return obj[Object.keys(obj)[0]].id;
  } catch (e) {
  }
})();


var dialog_id = process.env.DIALOG_ID || dialog_id_in_json || '<missing-dialog-id>';

// Create the service wrapper for dialog
var dialog = watson.dialog(credentials);

app.post('/conversation', function(req, res, next) {
  //an dieser Stelle den body.input abfangen und zum nlc schicken
  console.log(req.body.input);
  var nlcparams = {
    classifier: process.env.CLASSIFIER_ID || '<classifier-id>', // pre-trained classifier
    text: req.body.input
  };
  //input austauschen mit klassifizierung aus nlc
  nlClassifier.classify(nlcparams, function(err, results) {
    if (err) {
      return next(err);
    } else {
      //res.json(results);
      if(0.25 < results.classes[0].confidence)
        req.body.input = results.top_class;
      else {
        req.body.input = 'unknown';
      }
    }
  });

  console.log('Request body nach klassifizierung: ', req.body)

  var params = extend({ dialog_id: dialog_id }, req.body);
  dialog.conversation(params, function(err, results) {
    if (err)
      return next(err);
    else
      res.json({ dialog_id: dialog_id, conversation: results});
  });
});

app.post('/profile', function(req, res, next) {
  var params = extend({ dialog_id: dialog_id }, req.body);
  dialog.getProfile(params, function(err, results) {
    if (err)
      return next(err);
    else
      res.json(results);
  });
});


// Create the service wrapper for nlc
var nlClassifier = watson.natural_language_classifier({
  url : 'https://gateway.watsonplatform.net/natural-language-classifier/api',
  username : '<username>',
  password : '<password>',
  version  : 'v1'
});

// Call the pre-trained classifier with body.text
// Responses are json
app.post('/api/classify', function(req, res, next) {
  var params = {
    classifier: process.env.CLASSIFIER_ID || '<classifier-id>', // pre-trained classifier
    text: req.body.text
  };

  nlClassifier.classify(params, function(err, results) {
    if (err)
      return next(err);
    else
      res.json(results);
  });
});

// error-handler settings
require('./config/error-handler')(app);

var port = process.env.VCAP_APP_PORT || 3000;
app.listen(port);
console.log('listening at:', port);
