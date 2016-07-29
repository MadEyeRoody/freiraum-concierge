//
// POST/PUT to https://gateway.watsonplatform.net/dialog/api
// all the *.xml files in this directory.
//
// The files are uploaded with a name based on the file name plus the first
// characters of the username defined in the dialosg service credentials.
//
// A file called 'dialog-id.json' is kept with the ids returned by the service
// for each of the files.
//


'use strict';

var async = require('async'),
    bluemix = require('../config/bluemix'),
    fs = require('fs'),
    path = require('path'),
    request = require('request'),  // https://github.com/request/request
    extend     = require('util')._extend;

var nlcService = {
    getClassifiers: function(credentials) {

        request({
            url: credentials.url + '/v1/classifiers',
            auth: {
                user: credentials.username,
                pass: credentials.password
            }
        },

        function(error, response, body) {
            if (error) {
                console.log('error in retrieving classifiers: ', error);
            } else {
                var classifiers = {};
                var jsonBody = JSON.parse(body);
                if(jsonBody.classifiers){
                    jsonBody.classifiers.forEach(function (element) {
                        classifiers[element.created] = { id: element.classifier_id};
                    });
                }
                console.log('all received classifiers: ', JSON.stringify(classifiers));
                console.log(body);
                // TODO write classifiers to json file
                fs.writeFileSync('dialogs/classifier-id.json', JSON.stringify(classifiers, null, 4))
            }
        });
    }
  }

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

nlcService.getClassifiers(nlccredentials);
