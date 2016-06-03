var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
//var fs = require("fs");
//var Promise = require("bluebird"); //not used yet
var EventEmitter = require("events").EventEmitter;

var express = require('express');
var request = require('request');
// var app = express();
app.locals.apicem_ip = ""; //used to be static: sandboxapic.cisco.com:9443
//app.locals.apicem_user = "";
//app.locals.apicem_pass = "";
//var ticket_url = 'https://'+apicem_ip+'/api/v1/ticket';
var e_ticket = new EventEmitter();
var json_response = new EventEmitter();
app.locals.serviceTicket = '';  //global nodejs variable for auth ticket

var token ='';

//eventEmitter data for auth ticket that is finalized when asyncronous API calls are completed
e_ticket.on('update', function () {
    //console.log(body1.info.response.serviceTicket); // HOORAY! THIS WORKS!
    serviceTicket = e_ticket.info.response.serviceTicket;
    console.log("Service Ticket: ");
    console.log(serviceTicket);
    io.emit('chat message', serviceTicket); //displays ticket in HTML page
});

json_response.on('update', function () {
    //console.log(body1.info.response.serviceTicket); // HOORAY! THIS WORKS!
    resp = json_response.info;
    io.emit('chat message', resp); //displays ticket in HTML page
});

function get_ticket(t_url,user,pswd,output) {
     var options = {
         url: t_url,
          headers: {
           'Content-type': 'application/json'
       },
        body: JSON.stringify({
          username : user,
          password : pswd
        }),
      };
     console.log(t_url);
     console.log(options);
     request.post(options, function(error, response, body){ //POST to get service ticket
       if (!error && response.statusCode == 200) {
           // output is defined as e_ticket during function call
           output.info = (JSON.parse(body));
           output.emit('update');
           console.log("get_ticket API success");
      }
       else {
           //console.log(response.statusCode);
           console.log("inside callback POST ticket error");
           console.log(error);
       } //end of outer if
   }); //end of request.post
   //return serviceTicket;
}

var getJSON = function(api_url,output){
  //console.log("In getJSON");
  var options = {
    url: api_url,
    method: "GET",
    headers: {
      "X-Auth-Token": serviceTicket
    }
  };
  request.get(options, function(error, response, body){
    if (!error && response.statusCode == 200) {
      output.info = JSON.stringify(JSON.parse(body), null, 4)
      output.emit('update');
      console.log("inside success");
    }
    else {
      console.log("inside callback error");
      //console.log(error);
      //console.log(response);
      //console.log(body);
      //console.log(JSON.parse(body));

    }
  });

}



//get_ticket(ticket_url,"admin","C!sc0123");
// console.log(token);

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
//});

io.on('connection', function(socket){
  var resp ='';
  socket.on('GET api', function(msg){
            api_url = 'https://'+apicem_ip+'/api/v1/'+msg;
            getJSON(api_url,json_response);

            console.log(api_url)

  });
  socket.on('APIC info', function(url, username, password) {

      var ticket_url = 'https://'+url+'/api/v1/ticket';
      get_ticket(ticket_url,username,password,e_ticket);
      apicem_ip = url;
      //apicem_user = username;
      //apicem_pass = password;
         console.log(url);
         console.log(username);
         console.log(password);


     });

});

});

var port = Number(process.env.PORT || 3000);

http.listen(port, function(){
  console.log('listening on *: '+port);
});
