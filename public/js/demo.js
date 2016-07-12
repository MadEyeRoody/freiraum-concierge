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

/* global $:true */

'use strict';

// conversation variables
var conversation_id, client_id;

var inputHistory = [];
var inputHistoryPointer = -1

$(document).ready(function () {
  var $chatInput = $('.chat-window--message-input'),
    $jsonPanel = $('#json-panel .base--textarea'),
    $information = $('.data--information'),
    $profile = $('.data--profile'),
    $loading = $('.loader');


  $chatInput.keyup(function(event){
    if(event.keyCode === 13) {
      converse($(this).val());
    }
  });


  $chatInput.keydown(function(event){
    switch(event.which){
    	case 13: // enter
    	  inputHistory.push($chatInput.val());
    	  inputHistoryPointer = inputHistory.length;
    	break;
    	case 38: // up
    	if(inputHistoryPointer > 0){
    	   inputHistoryPointer--;
		   $chatInput.val(inputHistory[inputHistoryPointer]);
    	}

    	break;
    	case 40: // down
    	if(inputHistory.length > 0 && inputHistoryPointer < inputHistory.length - 1){
    	   inputHistoryPointer++;
		   $chatInput.val(inputHistory[inputHistoryPointer]);
    	}
      else if(inputHistoryPointer == inputHistory.length - 1){
        $chatInput.val("");
        inputHistoryPointer++;
      }
    	break;
    }

  });
  
  var converse = function(userText) {
    $loading.show();
    // $chatInput.hide();

    // check if the user typed text or not
    if (typeof(userText) !== undefined && $.trim(userText) !== '')
      submitMessage(userText);

    // build the conversation parameters
    var params = { input : userText };

    // check if there is a conversation in place and continue that
    // by specifing the conversation_id and client_id
    if (conversation_id) {
      params.conversation_id = conversation_id;
      params.client_id = client_id;
    }

    $.post('/conversation', params)
      .done(function onSuccess(dialog) {
        $chatInput.val(''); // clear the text input

        $jsonPanel.html(JSON.stringify(dialog.conversation, null, 2));

        // update conversation variables
        conversation_id = dialog.conversation.conversation_id;
        client_id = dialog.conversation.client_id;

        var texts = dialog.conversation.response;
        var response = texts.join('<br/>'); // &lt;br/&gt; is <br/>

        $chatInput.show();
        $chatInput[0].focus();

        $information.empty();

        addProperty($information, 'Dialog ID: ', dialog.dialog_id);
        addProperty($information, 'Conversation ID: ', conversation_id);
        addProperty($information, 'Client ID: ', client_id);

        talk('WATSON', response); // show

        getProfile();
      })
      .fail(function(error){
        talk('WATSON', error.responseJSON ? error.responseJSON.error : error.statusText);
      })
      .always(function always(){
        $loading.hide();
        scrollChatToBottom();
        $chatInput.focus();
      });

  };

  var getProfile = function() {
    var params = {
      conversation_id: conversation_id,
      client_id: client_id
    };

    $.post('/profile', params).done(function(data) {
      $profile.empty();
      data.name_values.forEach(function(par) {
        if (par.value !== '')
          addProperty($profile, par.name + ':', par.value);
      });
    }).fail(function(error){
      talk('WATSON', error.responseJSON ? error.responseJSON.error : error.statusText);
    });
  };

  var scrollChatToBottom = function() {
    var element = $('.chat-box--pane');
    element.animate({
      scrollTop: element[0].scrollHeight
    }, 420);
  };

  var scrollToInput = function() {
      var element = $('.chat-window--message-input');
      $('body, html').animate({
        scrollTop: (element.offset().top - window.innerHeight + element[0].offsetHeight) + 20 + 'px'
      });
  };

function getTagContent(text, tagName){

	var linkRegexp = new RegExp("<"+tagName+">(((?!<\/"+tagName+">).)*)</"+tagName+">", "g")
	var arr = [];
  var matchedLinks;

  while(matchedLinks = linkRegexp.exec(text)){
    arr.push(matchedLinks[1]);
  }
  return arr;
}

function replaceMctLinksByHtmlLinks(text){
    var text = text;
    var linksContent = getTagContent(text, "mct:link");

  linksContent.forEach(function(item){
    var url = getTagContent(item, "mct:url")[0];
    var label = getTagContent(item, "mct:label")[0];

    var link = "<a href=\""+url+"\" target=\"_blank\">"+label+"</a>";

   var regExp = new RegExp("<mct:link>"+item+"</mct:link>", "g");

   text = text.replace(regExp, link);

  });
  
  return text;
}

function replaceAutolearnItemsByButtons(text){
    var output = text;
    var itemsContent = getTagContent(text, "mct:autolearnitems");

  itemsContent.forEach(function(itemGroup){
    var itemsText = getTagContent(itemGroup, "mct:item");

    itemsText.forEach(function(innerText){
        var regExp = new RegExp("<mct:item>"+innerText+"</mct:item>", "g");
        var button = "<button class=\"wds-input\">"+innerText+"</button>";
        output = output.replace(regExp, button);
    });

  });

  output = output.replace(/<mct:autolearnitems>/g, "");
  output = output.replace(/<\/mct:autolearnitems>/g, "");

  return output;
}

  var postProcessOutput = function(text) {
      var output = text.replace(/<mct:input>/g, "<button class=\"wds-input\">");
      output = output.replace(/<\/mct:input>/g, "</button>");
      output = replaceMctLinksByHtmlLinks(output);
      output = replaceAutolearnItemsByButtons(output);
      return output;
  };

  var talk = function(origin, text) {
    var $chatBox = $('.chat-box--item_' + origin).first().clone();
    var $loading = $('.loader');
    var text = postProcessOutput(text);
    $chatBox.find('p').html($('<p/>').html(text).html());
    // $('.chat-box--pane').append($chatBox);
    $chatBox.insertBefore($loading);
    setTimeout(function() {
      $chatBox.removeClass('chat-box--item_HIDDEN');
    }, 100);
    
    $chatBox.find('button.wds-input').click(function(){
      var text = $(this).text();
      converse(text);
      inputHistory.push(text);
      inputHistoryPointer = inputHistory.length;
  });

  };

  var addProperty = function($parent, name, value) {
    var $property = $('.data--variable').last().clone();
    $property.find('.data--variable-title').text(name);
    $property.find('.data--variable-value').text(value);
    $property.appendTo($parent);
    setTimeout(function() {
      $property.removeClass('hidden');
    }, 100);
  };

  var submitMessage = function(text) {
    talk('YOU', text);
    scrollChatToBottom();
    clearInput();
  };

  var clearInput = function() {
    $('.chat-window--message-input').val('');
  };

  $('.tab-panels--tab').click(function(e){
    e.preventDefault();
    var self = $(this);
    var inputGroup = self.closest('.tab-panels');
    var idName = null;

    inputGroup.find('.active').removeClass('active');
    self.addClass('active');
    idName = self.attr('href');
    $(idName).addClass('active');
  });

  // Initialize the conversation
  converse();
  scrollToInput();

});
