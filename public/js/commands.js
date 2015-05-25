/**
 * COMMANDS FILE
 */



// example command
// this will print out a welcome message and the all the arguments
/*
 chat.add_cmd("hello", "prints a welcome message to the user", "Usage: hello [name]\n", function(args)
 {
 var arg_string = "";

 args.forEach( function( value )
 {
 arg_string += " " + value;
 });

 chat.log( "Welcome" + arg_string + "\n");
 });

 */


/**
 * Help Command
 *
 * Provide help information for commands
 *
 */
chat.add_cmd("help", "provides help information for commands", "provides help information for commands\nUsage: HELP [command-name]", function(args){

    // if we don't have args, display command list
    if (args.length == 0)
    {
        // going to buffer the commands as an example
        chat.buffer_clear();

        chat.log_buffer("For more information on a specific command, type \t  \"/help /command-name\"\n\n");
        chat.cmd_list.forEach(function(cmd)
        {
            // write to the temporary buffer
            chat.log_buffer(cmd.name + "\t - " + cmd.desc + "\n");
        });

        // dump the buffer
        chat.buffer_flush();
    }
    // display detailed help for command
    else
    {
        // get the command
        var cmd = chat.get_cmd(args[0]);

        // if the command doesn't exist, display error message
        if (cmd === 0)
            chat.log("Could not display help info for specified command : " + args[0] + "\n");
        else
        {
            // if the detailed help is a function, call the function
            if (typeof(cmd.help) === 'function')
                cmd.help();
            // just print out the string
            else if (typeof(cmd.help) === 'string')
                chat.log(cmd.help);
        }
    }
});

/**
 * Clear command
 *
 * Clear the chat outout.
 *
 */
chat.add_cmd("clear", "clears the chat output", "clears the chat output", function cmd_clear(args)
{
    chat.log_clear();
});


/**
 * Users Command
 *
 * List all users connected to de server
 *
 */
chat.add_cmd('users', 'list all users connected to de server.', 'Usage: /ulshow', function(){
    chat.socket.emit('get user list');
    chat.socket.on('get user list', function(data){
        chat.showSidebar('User list', 'Click to open a private conversation room.', data.userlist, false, 'userlist');
        chat.socket.removeAllListeners('get user list');
    });
});

/**
 * Rooms command
 *
 * List all public rooms in server
 */
chat.add_cmd('rooms', 'list all public rooms in server.', 'Usage: /rlshow', function(){
    chat.socket.emit('get room list');
    chat.socket.on('get room list', function(data){
        chat.showSidebar('Room list', 'Click to enter on selected room.', data.roomlist, false, 'roomlist');
        chat.socket.removeAllListeners('get room list');
    });
});

/**
 * joinroom command
 *
 * Join to a room if exists, if not create one
 */
chat.add_cmd('joinroom', '<b>join</b> to a room if exists, if not <b>create one</b>.', 'Usage: /joinroom', function(args){
    chat.joinRoomOrCreate(args);
});

/**
 * Leave command
 *
 * Join to a room if exists, if not create one
 */
chat.add_cmd('leave','leave from the current room', 'Use  \" leave\" to return to public room.', function(){
    chat.joinRoomOrCreate('public');
});


