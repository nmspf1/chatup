
/**
 * Module dependencies.
 */

var express = require('express'),
    app = express(),
    http = require('http').createServer(app),
    io = require('socket.io')(http),


    bodyParser = require('body-parser'),
    user = require('./routes/user'),
    path = require('path'),
    routes = require('./routes');




app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(require('stylus').middleware(__dirname + '/public'));
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(bodyParser.urlencoded({extended: false}));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});


//Routes
app.get('/', function(req, res){ //Home page
  res.render('index', {
    title: 'Home'
  });
});

app.get('/help', function(req, res){ //Help page
  res.render('help', {
    title: 'Help'
  });
});

//Socket server------------------------------------------------------------------------------------

//Global variables
var usernames = [];
var rooms = [];
var private_rooms = [];
var numUsers = 0;



io.on('connection', function (socket) {
    var addedUser = false;

    /**
     * Add new chat client
     */
    socket.on('adduser', function(data) {

        addedUser = true;

        //globalise variable
        socket.username = data.username;

        //if not undefined join room and globalise the variable room
        if(data.room !== undefined){
            socket.room = data.room;
            socket.join(socket.room);

            if(!check_rooms(socket.room)){
                //Insert roomname in array
                rooms.push(socket.room);
            }
        }

        //insert nickname in array
        usernames.push(data.username);

        //increment numusers
        ++numUsers;

        //Server side LOG
        console.log('User ' + socket.username + ' joined at room ' + socket.room);

        //Emit notification to the client
        socket.emit('updatechat', {
            message: 'You are in '+ socket.room+' room '+ socket.username,
            username: data.username,
            notification: 'Welcome to <b>' + socket.room + '</b> room <b>' + socket.username +'</b>'
        });

        //Broadcasts notification to all sockets in the given room, except to the socket on which it was called
        socket.broadcast.to(socket.room).emit('updatechat', {
            notification: '<b>'+socket.username + '</b> has connected to this room.',
            //message: '-- Users online updated: ' + numUsers +' --'
        });


    });


    /**
     * Join Room
     */
    socket.on('join room', function(data){

        console.log(socket.room);

        socket.room = data.room_name;

        console.log(data.room_name);

        //Join to the room if exists, if not create new room
        socket.join(socket.room);

        if(!check_rooms(socket.room)){
            //Insert roomname in array
            rooms.push(socket.room);

            socket.emit('updatechat', {
                message: '<i class="fa fa-bolt"></i> You are the creator of <b>' + socket.room + '</b> room.'
            });
        }

        socket.emit('updatechat', {
            notification: 'You are now in <b>' + socket.room +'</b> room.',
            message: 'You are now in <b>'+socket.room+'</b> room.'
        });

        //Broadcasts notification to all sockets in the given room, except to the socket on which it was called
        socket.broadcast.to(socket.room).emit('updatechat', {
            notification: '<b>'+socket.username + '</b> has connected to this room.'
        });

    });


    /**
     * Leave Room
     */
    socket.on('leave room', function(){

        //Leave the room
        socket.leave(socket.room);


        //Broadcasts notification to all sockets in the given room, except to the socket on which it was called
        socket.broadcast.to(socket.room).emit('updatechat', {
            notification: '<b>'+socket.username + '</b> left this room.'
        });


        //Delete room from array
        //delete rooms[rooms.indexOf(data.room)];

    });

    /**
     * Replay message
     */
    socket.on('reply', function(data){
        //Emmit to all users
        io.sockets.in(socket.room).emit('updatechat', {message: data.message});
        console.log(socket.room+' - '+data.message);
    });


    /**
     * Disconnect
     */
    socket.on('disconnect', function(){

        if(addedUser){
            delete usernames[usernames.indexOf(socket.username)];
            --numUsers;

            console.log('User ' + socket.username + ' left the room ' + socket.room);

            //Broadcasts notification to all sockets in the given room, except to the socket on which it was called
            socket.broadcast.to(socket.room).emit('updatechat', {
                message: '-- Users online updated: ' + numUsers +' --',
                notification: '<b>' + socket.username + '</b> left the room.'
            });
        }

    });

    /**
     * Get user list
     */
    socket.on('get user list', function(){
        socket.emit('get user list', {userlist: usernames});
    });

    /**
     * Get room list
     */
    socket.on('get room list', function(){
        socket.emit('get room list', {roomlist: rooms});
    });

    /**
     * Check if username already exists in array
     */
    socket.on('check_username', function(data){
        socket.emit('check_username', {check_: check_username(data.username)});
    });


    /**
     * Check if username exists in usernames array
     *
     * @param username
     * @returns {boolean}
     */
    function check_username(username)
    {
        for (var i =0 ; i< usernames.length ; i++)
        {
            if (usernames[i] === username)
                return true;
        }
        return false;
    }

    /**
     * Check if username exists in rooms array
     *
     * @param roomname
     * @returns {boolean}
     */
    function check_rooms(roomname)
    {
        for (var i = 0 ; i< rooms.length ; i++)
        {
            if (rooms[i] === roomname)
                return true;
        }
        return false;
    }

});


/*Start server*/
http.listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

