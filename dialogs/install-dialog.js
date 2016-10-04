//
// POST/PUT to https://gateway.watsonplatform.net/dialog/api
// all the *.xml files in this directory.
//
// This script is intendet to request the latest dialog id from the watson service
// and save it to a file for local development


'use strict';

var async = require('async'),
    bluemix = require('../config/bluemix'),
    fs = require('fs'),
    path = require('path'),
    request = require('request'),  // https://github.com/request/request
    extend     = require('util')._extend,
    certfile = path.resolve('ssl/FIDUCIA_ROOT.pem');

var dialogService = {
        getDialogs: function(credentials) {

            request.get({
                url: credentials.url + '/v1/dialogs',
                auth: {
                    user: credentials.username,
                    pass: credentials.password
                },
                strictSSL: false
                /*
                agentOptions: {
                    ca: fs.readFileSync(certfile)
                }
                */
            },

            function(error, response, body) {
                if (error) {
                    console.log('error in retrieving classifiers: ', error);
                } else {
                    var dialogs = {};
                    var jsonBody = JSON.parse(body);
                    if(jsonBody.dialogs){
                        jsonBody.dialogs.forEach(function (element) {
                            dialogs[element.created] = { id: element.dialog_id};
                        });
                    }
                    fs.writeFileSync('dialogs/dialog-id.json', JSON.stringify(dialogs, null, 4))
                    console.log('dialogs processed');
                }
            });
        }
      }

var dialogcreds = extend({
  url: '<url>',
  username: '<username>',
  password: '<password>',
  version: 'v1'
},
bluemix.getServiceCreds('dialog')
);

try {
    var vcap = JSON.parse(fs.readFileSync('./VCAP_Services.json'));
    dialogcreds = extend(dialogcreds, vcap.dialog[0].credentials);
} catch (e) {
    console.log('credentials json not existent')
}

dialogService.getDialogs(dialogcreds);
