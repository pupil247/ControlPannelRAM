/**
 * 
 *  FP 2023-10-02
 *  Permet l<int/gration de socket.io avec express generator
 *  File: socketApi.js
 */

var socket_io = require('socket.io');
var io = socket_io();
var socketApi = {};

socketApi.io = io;

io.on('connection',function(socket){
    console.log('A user is connected!');
})

socketApi.sendNotification = function() {
    io.sockets.emit('hello', {msg: 'Hello World!'});
}

module.exports = socketApi;