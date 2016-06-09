var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
//var fs = require("fs");
//var Promise = require("bluebird"); //not used yet
var EventEmitter = require("events").EventEmitter;
var request = require('request');

app.set('views','./views');
app.set('view engine', 'pug');
app.get('/', function (req, res) {
  res.render('index', { title: 'APIC-EM APIs with Node.js'});
  });
//app.get('/', function(req, res){
//    res.sendFile(__dirname + '/index.html');
//  });

var apicem_ip = ""; //used to be static: sandboxapic.cisco.com:9443
//app.locals.apicem_user = "";
//app.locals.apicem_pass = "";
//var ticket_url = 'https://'+apicem_ip+'/api/v1/ticket';
var e_ticket = new EventEmitter();
var json_response = new EventEmitter();
app.locals.serviceTicket = '';  //global nodejs variable for auth ticket

var token ='';
var jsonSocketTemp = '[' +
  '{"socket":"","serviceTicket":"" }]';
var jsonSocket = JSON.parse(jsonSocketTemp);
setInterval(function(){
    jsonSocket = JSON.parse(jsonSocketTemp);
  }, 600000);
//eventEmitter data for auth ticket that is finalized when asyncronous API calls are completed
e_ticket.on('update', function () {
    //console.log(body1.info.response.serviceTicket); // HOORAY! THIS WORKS!
    console.log("socketID = "+e_ticket.socketID);
    if (e_ticket.info != "ERROR"){
      serviceTicket = e_ticket.info.response.serviceTicket;
      console.log("Service Ticket: ");
      console.log(serviceTicket);
      //io.emit('chat message', "Success, authentication token: "+ serviceTicket); //displays ticket in HTML page
      io.sockets.connected[e_ticket.socketID].emit('chat message', "Success, authentication token: "+ serviceTicket);
      jsonSocket.push({"socket":e_ticket.socketID,"serviceTicket":serviceTicket });
      console.log(JSON.stringify(jsonSocket));
    }
    else{
      console.log("error");
      //console.log(serviceTicket);
      io.sockets.connected[e_ticket.socketID].emit('chat message', "Error in authentication token. Try again."); //displays ticket in HTML page
    }

});

json_response.on('update', function () {
    //console.log(body1.info.response.serviceTicket); // HOORAY! THIS WORKS!
    //resp = JSON.stringify(json_response.info.response, null, 4);
    console.log("socketID = "+json_response.socketID);
    resp = json_response.info.response;
    //console.log("resp = "+ resp);
    if (resp){
      io.sockets.connected[json_response.socketID].emit('chat message', resp); //displays ticket in HTML page
    }
    else{
      io.sockets.connected[json_response.socketID].emit('chat message', "API error: No response"); //displays ticket in HTML page
    }

});

function get_ticket(t_url,user,pswd,output,socketID) {
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
           output.socketID = socketID;
           output.emit('update');
           console.log("get_ticket API success");
      }
       else {
           //console.log(response.statusCode);
           console.log("inside callback POST ticket error");
           //console.log(JSON.parse(body));
           output.info = "ERROR";
           output.socketID = socketID;
           output.emit('update');
       } //end of outer if
   }); //end of request.post
   //return serviceTicket;
};

var getJSON = function(api_url,output,socketID,sTicket){
  //console.log("In getJSON");
  var options = {
    url: api_url,
    method: "GET",
    headers: {
      "X-Auth-Token": sTicket
    }
  };
  request.get(options, function(error, response, body){
    if (!error && response.statusCode == 200) {
      //output.info = JSON.stringify(JSON.parse(body), null, 4)
      output.info = JSON.parse(body);
      output.socketID = socketID;
      output.emit('update');
      console.log("inside success");
    }
    else {
      console.log("inside callback error");
      output.info = "API error";
      output.socketID = socketID;
      output.emit('update');
      //console.log(error);
      //console.log(response);
      //console.log(body);
      //console.log(JSON.parse(body));

    }
  });

};



//get_ticket(ticket_url,"admin","C!sc0123");
// console.log(token);



//var listOfSockets = {};

io.on('connection', function(socket){
  var resp ='';
  //console.log("io.id="+io.id);
  console.log("socket.id="+socket.id);
  console.log("Number of connected clients: "+io.engine.clientsCount);
  io.sockets.emit('socketCount',io.engine.clientsCount);
  //io.sockets.connected[socket.id].emit("test",socket.id);

  //listOfSockets[socket.id] = {
  //  temp1 : "tempval1"
  //}
  //console.log("listOfSockets= "+listOfSockets);
  socket.on('GET api', function(msg){
            var tempTick = "";
            api_url = 'https://'+apicem_ip+'/api/v1/'+msg;
            for (var i in jsonSocket){
              //console.log("i= "+jsonSocket[i].socket);
              if (jsonSocket[i].socket === socket.id){
                console.log("test ticket for socket: "+ jsonSocket[i].serviceTicket);
                tempTick = jsonSocket[i].serviceTicket;
              }
            };
            getJSON(api_url,json_response,socket.id,tempTick);

            console.log(api_url)
            console.log(socket.id);

  });
  socket.on('APIC info', function(url, username, password) {
      //console.log("apic info call");
      var ticket_url = 'https://'+url+'/api/v1/ticket';
      get_ticket(ticket_url,username,password,e_ticket,socket.id);
      apicem_ip = url;
      //apicem_user = username;
      //apicem_pass = password;
         console.log(url);
         console.log(username);
         console.log(password);


     });

  socket.on('disconnect', function(){
    console.log("Disconnect: "+socket.id);
    io.sockets.emit('socketCount',io.engine.clientsCount);
    //delete listOfSockets[socket.id];
  });

});



var port = Number(process.env.PORT || 3000);

http.listen(port, function(){
  console.log('listening on *: '+port);
});


//console.log("jsonTest = "+jsonTest[1].socket);
//console.log("jsonSocket = "+jsonSocket[0].socket);
//jsonSocket[0].socket = "jojo";
//console.log("jsonSocket = "+jsonSocket[0].socket);
//console.log("jsonSocket = "+jsonSocket);

//for (var i in jsonSocket){
  //console.log("i= "+jsonSocket[i].socket);
  //if (jsonSocket[i].socket === "jojo"){
    //console.log("deleting "+ JSON.stringify(jsonSocket[i]));
    //delete jsonSocket[i];

  //}
//};
//console.log(JSON.stringify(jsonSocket));
