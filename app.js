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
  watson     = require('watson-developer-cloud'),
  pouchdb    = require('pouchdb');

// Bootstrap application settings
var settings = require('./config/express')(app);

// if bluemix credentials exists, then override local
var credentials =  extend({
  url: '<url>',
  username: '<username>',
  password: '<password>',
  version: 'v1'
},
bluemix.getServiceCreds('dialog')); // VCAP_SERVICES

try {
    var vcap = JSON.parse(fs.readFileSync('./VCAP_Services.json'));
    credentials = extend(credentials, vcap.dialog[0].credentials);
} catch (e) {
    console.log('credentials json not existent')
}

var dialog_id_in_json = (function() {
  try {
    var dialogsFile = path.join(path.dirname(__filename), 'dialogs', 'dialog-id.json');
    var obj = JSON.parse(fs.readFileSync(dialogsFile));
    return obj[Object.keys(obj)[0]].id; //return id field of first object
  } catch (e) {
  }
})();

var dialog_id = process.env.DIALOG_ID || dialog_id_in_json || '<dialog_id>';

// Create the service wrapper for dialog
var dialog = watson.dialog(credentials);

// if bluemix credentials exists, then override local
var nlccredentials =  extend({
  url : 'https://gateway.watsonplatform.net/natural-language-classifier/api',
  username : '<username>',
  password : '<password>',
  version  : 'v1'
},
bluemix.getServiceCreds('natural_language_classifier')); // VCAP_SERVICES

try {
    var vcap = JSON.parse(fs.readFileSync('./VCAP_Services.json'));
    nlccredentials = extend(nlccredentials, vcap.natural_language_classifier[0].credentials);
} catch (e) {
    console.log('credentials json not existent')
}

// Create the service wrapper for nlc
var nlClassifier = watson.natural_language_classifier(nlccredentials);

app.post('/conversation', function(req, res, next) {
  var params = extend({ dialog_id: dialog_id }, req.body);
  dialog.conversation(params, function(err, results) {
    if (err)
      return next(err);
    else
      res.json({ dialog_id: dialog_id, conversation: results});
  });
});

// create cloudant credentials
var cloudantcredentials = extend({
  username: '<username>',
  password : '<password>',
  url : '<url>',
  host : '<host>',
  port : '<port>',
  dbname : '/freecon_saved_dialogs'
},
bluemix.getServiceCreds('cloudantNoSQLDB')); // VCAP_SERVICES

var db = new pouchdb(cloudantcredentials.url + cloudantcredentials.dbname);

app.post('/profile', function(req, res, next) {
  var params = extend({ dialog_id: dialog_id }, req.body);
  dialog.getProfile(params, function(err, results) {
    if (err)
      return next(err);
    else
      res.json(results);
  });
});

var classifier_id_in_json = (function() {
  try {
    var classifierFile = path.join(path.dirname(__filename), 'dialogs', 'classifier-id.json');
    var obj = JSON.parse(fs.readFileSync(classifierFile));
    //classifiers are ordered by creation date
    return obj[Object.keys(obj)[0]].id; //return id field of first object
  } catch (e) {
  }
})();

var classifier_id = process.env.CLASSIFIER_ID || classifier_id_in_json ||'<classifier-id>';

// Call the pre-trained classifier with body.text
// Responses are json
app.post('/api/classify', function(req, res, next) {
  console.log('request accepted. text to classify is: ', req.body.text);

  var nlcparams = {
    classifier: classifier_id, // pre-trained classifier
    text: req.body.text
  };

  console.log('Die parameter für den nlc aufruf sind: ', nlcparams);

  nlClassifier.classify(nlcparams, function(err, results) {
    console.log('in der callback methode zu classify');
    if (err) {
      console.log('fehler aufgetreten beim klassifizieren');
      return next(err);
    } else {
      res.json(results);
      console.log('request accepted. category is: ',results);

    }
  });
});

app.post('/api/save', function(req, res, next){
    console.log('saving request received. Payload is: ', req.body.dialog);

    db.post(req.body.dialog)
        .then(function (response){
          var resp = {status: 'success'};
          res.json(resp);
        })
        .catch(function (err){
         return next(err);
        });
});

// error-handler settings
require('./config/error-handler')(app);

var port = process.env.VCAP_APP_PORT || 3000;
app.listen(port);
console.log('listening at:', port);

module.exports = app;
