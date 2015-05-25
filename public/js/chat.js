//chat Class
var chat = {


    //Commands list
    cmd_list : [],

    //Console prompt
    cmd_prompt : "> ",

    //command history
    cmd_history : [],

    //history size
    cmd_history_size: 16,

    cmd_index : -1,

    //command prefix
    cmd_prefix : '/',

    //Input html element
    input_elm : null,

    //Output html element
    output_elm : null,

    //In console buffer
    in_buffer : "",

    //In
    tmp_buffer : "",

    //Input max buffer size
    input_buffer_max : 20,

    //Default nickname
    nickname : 'Guest',

    //Default room name
    chat_room : 'public',

    //Bool
    setNicknameBool: true,


    /**
     * Init method
     */
    init : function(){

        //Log in browser console
        console.log('Welcome to ChatUp. LOGS');


        //Save common elements
        this.input_elm = $('#console_input');
        this.output_elm = $('#console_output');
        this.content_elm = $('.content-console');
        this.notifContainer_elem = $('#notifications');
        this.sideBar = $('#sideBar');

        //Init socket.io object
        this.socket = io();


        //Log welcome message
        this.write('Welcome to ChatUp\n\nPlease enter your nickname:', 30);

        //Clean log and input
        this.log_clear();
        this.input_clear();


        self = chat;
        // bind to global keypress events
        $(document).on('keydown', function(event)
        {
            // the backspace key. prevent default action going back in the browser
            if (event.keyCode === 8) {
                self.handle_input(event);
                return false;
            }
            // the arrow keys are used for going through the command history
            else if (event.keyCode >= 37 && event.keyCode <= 40) {
                self.handle_input(event);
                return false;
            }
        });

        // handle other keys in the keypress event
        $(document).on('keypress', this.handle_input);


    },

    /**
     * Handle key events
     *
     * @param event
     */
    handle_input : function(event)
    {
        /*
        if (event.keyCode === 10 )
            return;
        */

        var self = chat;
        if (event.keyCode === 8 ) //BACKSPACE
        {
            //
            self.input_log(self.in_buffer.slice(0, self.in_buffer.length-1));
        }

        // ENTER key pressed
        else if (event.keyCode === 13)
        {
            var cmd_string = self.in_buffer;

            // if not empty
            if(cmd_string !== '') {

                //if the cmd string have the prefix, parse then run the command if not send the message
                if(cmd_string.substr(0, 1) === self.cmd_prefix  && !self.setNicknameBool) {

                    self.input_clear();
                    self.log(self.cmd_prompt + cmd_string);

                    // reset the history pointer and add the command
                    self.cmd_index = -1;

                    // parse the string to get the command and arguments
                    var cmd_obj = self.parse_cmd(cmd_string);

                    // if the command is not empty, run the command and save the command string to the history
                    if (cmd_obj.cmd != "") {
                        self.run_cmd(cmd_obj.cmd, cmd_obj.args);
                        self.add_cmd_history(cmd_string);
                    }

                }else{

                    //if the nickname has been set
                    if(self.setNicknameBool)
                    {

                        //Check if nickname is already in use and emit the username to compare with array in server
                        self.socket.emit('check_username', {username: '@'+ self.cleanInput(cmd_string)});

                        self.socket.on('check_username',function(data){
                            //if not already in use set nickname and initialize chat
                            if(!data.check_){
                                    self.setNicknameBool = false;

                                    //Set nickname
                                    self.nickname = '@'+ self.cleanInput(cmd_string);

                                    //Initialize chat
                                    self.init_chat_service();

                                    //extends ths buffer size
                                    self.input_buffer_max = 256;
                            }else{
                                //Show notification
                                self.showNotification('Nickname already in use!', 4000, true);
                                self.input_clear();
                            }

                            //Remove check_username listener to prevent event propagation
                            self.socket.removeAllListeners('check_username');
                        });

                    }else{
                        //run the method to send the message
                        self.send_chat_message(self.cmd_prompt + cmd_string);
                        self.input_clear();
                    }

                }
            }

        }

        // key up and down. use to move up and down through the history
        else if (event.charCode == 0 && (event.keyCode >= 37 && event.keyCode <= 40)) // ARROWS keys
        {
            if (event.keyCode === 38)// UP
            {
                if (self.cmd_history.length > 0)
                {
                    if (self.cmd_index < self.cmd_history.length-1)
                        self.cmd_index++;

                    self.in_buffer = self.cmd_history[self.cmd_index];
                    self.input_log(self.in_buffer);
                }
            }
            else if (event.keyCode === 40) // DOWN
            {
                if (self.cmd_index > -1)
                    self.cmd_index--;

                if (self.cmd_index > -1 )
                    self.input_log(self.cmd_history[self.cmd_index]);
                else
                    self.input_log("");
            }
        }

        else  // handle OTHER characters
        {
            //limit buffer size
            if (self.in_buffer.length < self.input_buffer_max)

                //log into the chat screen
                self.input_log(self.in_buffer + String.fromCharCode(event.which));
        }
    },

    /**
     * Stupid typing effect
     *
     * @param str
     * @param delay
     * @returns {boolean}
     */
    write : function(str, delay){

        if(delay === undefined){
            //Default delay
            delay = 50;
        }

        var txt = (str).split('');
        for ( i=0; i<txt.length;i++){
            setTimeout(function(){
                chat.log(txt.shift(), false);
            }, delay * i)
        }
        return false;
    },


    /**
     * Add a new command to the console
     *
     * @param name - name of the command
     * @param desc - short description displayed by help command
     * @param help - detailed help displayed when running help command_name
     * @param callback - the function to run when the command is run
     */
    add_cmd : function(name, desc, help, callback)
    {
        // add the command to the command list object
        this.cmd_list.push({ "name" : this.cmd_prefix + name.toLowerCase(), "desc" : desc.toLowerCase(), "help" : help, "callback" : callback});

        //sort the commands alphabetically
        this.cmd_list.sort(function(a, b)
        {
            return (a.name < b.name) ? -1 : ((a.name > b.name) ? 1 : 0);
        });
    },


    /**
     * Return the command object for the specified name if the command exists in object
     *
     * @param cmd_name
     * @returns {*}
     */
    get_cmd : function(cmd_name)
    {
        for (var i =0 ; i< this.cmd_list.length ; i++)
        {
            if (this.cmd_list[i].name === cmd_name)
                return this.cmd_list[i];
        }

        return 0;
    },



    /**
     * Parses a string into the command and an array of arguments
     *
     * @param cmd_string
     * @returns {{cmd: *, args: Array.<T>}}
     */
    parse_cmd : function(cmd_string)
    {
        // replace extra whitespace
        var parts = cmd_string.trim().replace(/\s+/g, " ").split(" ");
        var cmd = parts[0];

        //if bigger than one
        var args = parts.length > 1 ? parts.slice(1, parts.length) : [];

        return { "cmd" : cmd, "args" : args };
    },


    /**
     * Run the command by calling the command callback function
     *
     * @param cmd
     * @param args
     */
    run_cmd : function(cmd, args)
    {
        // find the command
        var cmd_obj = this.get_cmd(cmd);

        if (cmd_obj === 0)
            this.showNotification('Command not recognized: <b>'+cmd+'</b>', 3000, true);
        else
        {
            //Run the callback if provided
            if (typeof(cmd_obj.callback) === 'function')
                cmd_obj.callback(args);
        }
    },


    /**
     * Print text to the console buffer
     *
     * @param str
     * @param breakline
     */
    log : function(str, breakline)
    {
        if(str !== undefined){
            if(breakline == false){
                this.output_elm.append(str + '');
            }else{
                this.output_elm.append(str + '\n');
            }

            this.content_elm.scrollTop(10000);
        }
    },


    /**
     * Clear the output buffer of the console
     *
     */
    log_clear : function()
    {
        this.output_elm.empty();
    },


    /**
     * Used to write log text to a temporary buffer, this will prevent the log from refreshing after each log command.
     * ! Also is used to print out lots of information.
     *
     * @param str
     */
    log_buffer : function(str)
    {
        this.tmp_buffer += str;
    },


    /**
     * This dumps the log buffer to the log output
     *
     */
    buffer_flush : function()
    {
        this.log(this.tmp_buffer);
        this.buffer_clear();
    },

    /**
     * Clear the buffer
     *
     */
    buffer_clear : function()
    {
        this.tmp_buffer = "";
    },

    /**
     * Print text to the input buffer
     *
     * @param str
     */
    input_log : function(str)
    {
        this.in_buffer = str;
        this.input_elm.text(this.cmd_prompt + str);
    },


    /**
     * Clear the input buffer
     *
     */
    input_clear : function()
    {
        this.in_buffer = "";
        this.input_elm.html(this.cmd_prompt);
    },


    /**
     * Add the command string to the command history
     *
     * @param str
     */
    add_cmd_history : function(str)
    {
        this.cmd_history.unshift(str);

        if (this.cmd_history.length >= this.cmd_history_size)
            this.cmd_history.pop();
    },


    /**
     * Reset command history
     *
     */
    clear_cmd_history : function()
    {
        this.cmd_history = [];
    },


    /**
     * Show a notification bubble from the top of window
     *
     * @param msg
     * @param timeout
     * @param shake
     */
    showNotification : function(msg, timeout, shake){

        //if timeout undefined = 2000
        timeout = typeof timeout === 'undefined' ? timeout : 4000;


        if(msg !== undefined) {

            //Notification body
            var htmlNotif = ('<div class="notif"><p><i class="fa fa-bullhorn"></i>  ' + msg + '</p></div>');

            //Remove .notif from DOM
            $('.notif').remove();

            //insert html in DOM
            this.notifContainer_elem.append(htmlNotif);

            //Add class to .notif element to start css animation
            $('.notif').addClass('animated bounceInDown').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function () {

                if (shake === true) {
                    $(this).removeClass('bounceInDown').addClass('shake');
                }

                //timeout hide bubble
                setTimeout(function () {
                    $('.notif').addClass('animated bounceOutUp', function () {
                        $(this).remove();
                    });
                }, timeout);

            });
        }

    },


    /**
     * Add new chat client
     *
     */
    init_chat_service : function(){


        var self = chat;

        //Clear the log and input space
        this.log_clear();
        this.input_clear();


        //Add client to the server
        this.socket.emit('adduser', {username: this.nickname, room: '#' + this.chat_room});

        //add label with room name
        this.setRoomName('#'+ this.chat_room);

        //nickname in prompt
        self.cmd_prompt = this.nickname + ' > ';
        self.input_clear();

        //Get server response
        this.socket.on('updatechat', function(data){
            self.showNotification(data.notification, 10000);//Show notification 10s
            self.log(data.message);
        });


    },

    /**
     * Emit emit the message
     *
     * @param msg
     */
    send_chat_message : function(msg){
        this.socket.emit('reply', {message: msg});
    },


    /**
     * Join to a room or create one
     *
     * Basically leave the current room and enter or create new room
     *
     * @param roomname
     */
    joinRoomOrCreate : function (roomname) {
        if(this.cleanInput(roomname) !== ''){
            roomname = this.cleanInput(roomname);
            if(this.chat_room !== '#'+roomname && this.chat_room !== roomname){
                this.log_clear();
                this.socket.emit('leave room');
                this.chat_room = roomname;
                this.setRoomName('#' + roomname);
                this.socket.emit('join room', {room_name: '#' + roomname});
            }else{
                this.showNotification('You can´t exit from this room', 2000, true);
            }
        }else{
            this.showNotification('<b>/joinroom</b> the arguments can not be empty', 10000, true);
        }
    },



    /**
     * Prevent input from having injected markup
     *
     * @param input
     * @returns {*|jQuery}
     */
    cleanInput : function (input) {
        return $('<div/>').text(input).text();
    },

    /**
     * Show sidebar
     *
     * @param title
     * @param desc
     * @param array
     * @param autohide
     * @param command
     */
    showSidebar : function (title, desc, array, autohide, command) {

        //default values of this method
        autohide = typeof autohide !== 'undefined' ? autohide : false;

        self = chat;

        this.sideBar.show(function(){

            $('.sideBarContent').remove();

            $('#sideBar').append('<div class="sideBarContent"><h3>'+ title +'</h3><small>'+desc+'</small><br><br></div>');

            $('#sideBar').animate({right:'0px'});


            switch(command){
                case 'roomlist':
                    //List all data in array
                    array.forEach(function(value){
                        if(value !== null){
                            if('#'+self.chat_room !== value){
                                $('.sideBarContent').append('<a href="javascript: chat.joinroomByClick(\''+ value +'\')">' + value + '</a><br>');
                            }
                        }
                    });
                break;

                case 'userlist':
                    //List all data in array
                    array.forEach(function(value){
                        if(value !== null){
                            $('.sideBarContent').append('<a href="javascript: chat.joinPrivateRoomOrCreateByClick(\''+ value +'\')">' + value + '</a><br>');
                        }
                    });
                break;

                case 'none':
                    break;

                default:
                    //List all data in array
                    array.forEach(function(value){
                        if(value !== null){
                            $('.sideBarContent').append('<a href="#">' + value + '</a><br>');
                        }
                    });
                break;
            }



            //Auto hide
            if(autohide === true){
                setTimeout(function(){
                  self.hideSideBar();
                }, 50000);
            }

            //Hide with a click in console
            $('.container').click(function () {
                self.hideSideBar();
            });
        });

    },

    /**
     * Hide sidebar
     *
     */
    hideSideBar : function () {
        $('#sideBar').animate({right:'-400px'}, function(){
            $('#sideBar').fadeOut();
            $('.sideBarContent').remove();
        });
    },


    /**
     * Set label with current room name
     *
     * @param roomname
     */
    setRoomName : function (roomname) {
        $('#roomname').append('');
        $('#roomname').empty().append('<p>' + roomname + '</p>');
    },


    /**
     * Join room by clicking on sitebar link
     *
     * @param roomname
     */
    joinroomByClick : function (roomname) {
        this.joinRoomOrCreate(roomname.substr(1, 200).trim());
        this.hideSideBar();
    },



    /**
     * Stupid browser console animation
     *
     */
    nyan : function(){
        var _nyan = 0;
        var __nyan = [[
            "+      o     +              o      ",
            "    +             o     +       +  ",
            "o          +                       ",
            "    o  +           +        +      ",
            "+        o     o       +        o  ",
            "-_-_-_-_-_-_-_,------,      o      ",
            "_-_ChatUp-_-_-|   /\\_/\\            ",
            "-_-_-_-_-_-_-~|__( ^ .^)  +     +  ",
            "_-_-_-_-_-_-_-\"\"  \"\"               ",
            "+      o         o   +       o     ",
            "    +         +                    ",
            "o        o         o      o     +  ",
            "    o           +                  ",
            "+      +     o        o      +     "],

            ["+      o     +              +      ",
                "    o             o     o       +  ",
                "o          +                       ",
                "    +  o           +        o      ",
                "o        o     o       +        o  ",
                "_-_-_-_-_-_-_-,------,      +      ",
                "-_-_-_-_-_-_-_|   /\\_/\\            ",
                "_-_-ChatUp_-_-|__( ^ .^)  o     +  ",
                "-_-_-_-_-_-_-_ \"\"  \"\"              ",
                "+      +         o   +       o     ",
                "    o         +                    ",
                "+        +         +      +     o  ",
                "    +           o                  ",
                "+      o     o        o      +     "]];


        function nyan(){
            console.clear();
            console.log(__nyan[_nyan].join("\n"))
            if(_nyan == 0){ _nyan = 1; } else {	_nyan = 0; }
        }
        window.setInterval(nyan, 300)
    }


};




