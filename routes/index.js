/**
 * 
 *  FP 2023-12-20
 *  Site web de controle pour le panneau RAM
 *  File: index.js
 */

// --------- Server Variables --------//
var express = require('express');
var router = express.Router();
var mqtt = require('mqtt');
const session = require ('cookie-session');
var mysql = require('mysql');
var client  = mqtt.connect('mqtt://127.0.0.1:1883');
var { io } = require('../socketApi');
var noClient = 1;

const alarmesActives = {
  debordementGB: 0,
  debordementPB: 0,
  limiteHautePB: 0,
  limiteHauteGB: 0,
  timeoutBalance: 0,
  timeoutPowermeter: 0
}
const infosBalance = {
  poids: 0,
  tare: 0,
  erreur: "N/A",
  unit: "N/A"
}

const infosPowerMeter = {
  vab: 0.0,
  vbn: 0.0,
  van: 0.0,
  ia: 0.0,
  ib: 0.0,
  kw: 0.0,
  kwh: 0.0,
  fp: 0.0,
  erreur: 0
}

/*const infosMelangeur = {
  
}*/

const infosPanneau = {
  nivGB: 0,
  nivPB: 0,
  tempPB: 0,
  valveGB: 0,
  valvePB: 0,
  valveEC: 0,
  valveEF: 0,
  valveEEC: 0,
  valveEEF: 0,
  pompe: 0,
  mode: 0,
  purgeGB: 0,
  purgePB: 0,
}
// ------------------------------ //

// --------- Session --------//
router.use(session({
  secret: 'todotopsecret',
  resave: false,
  saveUninitialized: true,
  maxAge: 600000 //BONUS timeout
})).use(function(req, res, next) {

  if (typeof(req.session.user) == 'undefined') {
      req.session.user = {
        id: 0,
        login: '',
        type: 0,
        password: ''
      }
  }
  next();
});
// -----------------//

// --------- MYSQL --------//
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'root',
  database : 'userlogin'
});

var connection2 = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'root',
  database : 'userlogin'
});

connection.connect(function (err) {
  if (err) throw err;
  console.log('Vous êtes connecté à votre BDD...');
});
// -----------------------//



// --------- Login --------//
router.get('/',function(req,res){   
  if(req.session.user.login == '')
    res.render('pages/login', {erreur:""});
  else
  {
    var querystring =  'SELECT * FROM users WHERE login = "'+req.session.user.login+'" AND password = "'+req.session.user.password+'";';
    var query = connection.query(querystring, function(err, rows, fields) {
      if (!err) {
        if(rows.length >= 1){
          renderCorrectPage(req,res,"pages/accueil");
        }
        else
          res.render('pages/login',{erreur: "Utilisateur inconnu"});
      }
      else
        res.render('pages/error'); 
    });
  }
}).post('/',function(req,res,next){
  switch(req.body.formName.toString())
  {
    case "login":
      var querystring =  'SELECT * FROM users WHERE login = "'+req.body.username+'" AND password = "'+req.body.password+'";';
      var query = connection.query(querystring, function(err, rows, fields) {
        if (!err) {
          if(rows.length >= 1){
            if(rows[0].niveauDroit >= 3){
              var querystring1 =  'SELECT * FROM users;'; 
              var query1 = connection.query(querystring1, function(err1, rows1, fields1) {
                req.session.user.id = rows[0].id;
                req.session.user.login = req.body.username;
                req.session.user.type = rows[0].niveauDroit;
                req.session.user.password = rows[0].password;
                res.render('pages/accueil', {niveauDroit: req.session.user.type});    
              });
            }
            else{
              req.session.user.id = rows[0].id;
              req.session.user.login = req.body.username;
              req.session.user.type = rows[0].niveauDroit;
              req.session.user.password = rows[0].password;
              res.render('pages/accueil', {niveauDroit: req.session.user.type});
            }  
          }
          else
            res.render('pages/login',{erreur: "Utilisateur inconnu"});
        }
        else
          res.render('pages/error');       
      });
      break;
    case "logout":
      req.session.user = {
        id: 0.0,
        login: '',
        type: 0.0,
        password: ''
      }
      res.render("pages/login", {erreur: "Déconnexion"});
    default:
      break;
  }
});
// -----------------------//

// --------- Pages --------//
router.get('/balance', function(req,res){
  renderCorrectPage(req,res,"pages/balance");
}).get('/alarmes', function(req,res){
  renderCorrectPage(req,res,"pages/alarmes");
}).get('/panneau', function(req,res){
  renderCorrectPage(req,res,"pages/panneau");
}).get('/powermeter', function(req,res){
  renderCorrectPage(req,res,"pages/powermeter");  
}).get('/camera', function(req,res){
  renderCorrectPage(req,res,"pages/camera");
}).get('/gestion', function(req,res){
  renderCorrectPage(req,res,"pages/gestion");
}).get('/journal', function(req,res){
  console.log("test");
  renderCorrectPage(req,res,"pages/journal");
}).get('/alarmesconfig', function(req,res){
  renderCorrectPage(req,res,"pages/configalarmes");
});

router.post('/journal', function(req,res){
  var requestUsers;
  if(req.body.dateEnd == req.body.dateBegin){
    if(req.body.login.length != 0)
      requestUsers =  "SELECT * FROM logdata WHERE UserLogin = '"+req.body.login + "' AND ReqTime LIKE '"+ req.body.dateBegin +"%';";
    else
      requestUsers = "SELECT * FROM logdata WHERE ReqTime LIKE '" + req.body.dateBegin +"%';";
  }
  else{
    if(req.body.login.length != 0)
      requestUsers =  "SELECT * FROM logdata WHERE UserLogin = '"+req.body.login + "' AND ReqTime <= '"+ req.body.dateEnd +"' AND ReqTime >= '" + req.body.dateBegin +"';";
    else
      requestUsers = "SELECT * FROM logdata WHERE ReqTime <= '"+ req.body.dateEnd +"' AND ReqTime >= '" + req.body.dateBegin +"';";
  }
 
  console.log(requestUsers);
  renderCorrectPage(req,res,"pages/journal",requestUsers);
});
// -----------------------//

//-------- Error ---------//
router.use(function(req,res){
  res.status(404).end('ERREUR 404!');   
});
// -----------------------//

//-------- MQTT et Socket.io ---------//
client.on('message', function (topic, message) {
  //console.log(topic.toString());
  //console.log(message.toString());
  
});

client.on('connect', function () {
    console.log("MQTT connecté !");
    client.subscribe('RAM/#');
    client.publish('module', 'le serveur js vous dit bonjour');  
});

io.sockets.on('connection', function (socket) {
  
  socket.on('addLog', function(message){
    addLog(message.split("/")[0], message.split("/")[1], message.split("/")[2]); // "userLogin/commandType/infos"

  });
  socket.on('changePhrase', function(message) {
    // SQL query to update a field
    var updateFieldQuery = 'UPDATE users SET texteAccueil = "'+message.split('/')[2]+'" WHERE login = "'+message.split('/')[0]+'" AND password = "'+message.split('/')[1]+'";';
    var query = connection.query(updateFieldQuery,function(err, result) {
      if(!err){
        console.log("donnée modifiée avec succès");
      }   
    });
    socket.emit('refreshPage','refreshPage');
    socket.broadcast.emit('refreshPage','refreshPage');
  });

  socket.on('changePassword', function(message) {
    // SQL query to update a field
    var updateFieldQuery = 'UPDATE users SET password = "'+message.split('/')[2]+'" WHERE login = "'+message.split('/')[0]+'" AND password = "'+message.split('/')[1]+'";';
    var query = connection.query(updateFieldQuery,function(err, result) {
      if(!err){
        console.log("donnée modifiée avec succès");
      }   
    });
    socket.emit('refreshPage','refreshPage');
    socket.broadcast.emit('refreshPage','refreshPage');
  });

  client.on('message', function (topic, message) {
    if(topic.split('/')[0] == "RAM") {
      switch(topic.split('/')[1]){
        case "panneau":
          if(topic.split('/')[2]=="etats"){
            if(topic.split('/')[3] == "NivGB")
              infosPanneau.nivGB = message.toString();
            else if(topic.split('/')[3] == "NivPB")
              infosPanneau.nivPB = message.toString(); 
            else if(topic.split('/')[3] == "ValveEC")
              infosPanneau.valveEC = message.toString();
            else if(topic.split('/')[3] == "ValveEF")
              infosPanneau.valveEF = message.toString();  
            else if(topic.split('/')[3] == "ValveEEC")
              infosPanneau.valveEEC = message.toString();  
            else if(topic.split('/')[3] == "ValveEEF")
              infosPanneau.valveEEF = message.toString(); 
            else if(topic.split('/')[3] == "Pompe")
              infosPanneau.pompe = message.toString();
            else if(topic.split('/')[3] == "TmpPB")
              infosPanneau.tempPB = message.toString();  
            else if(topic.split('/')[3] == "mode")
              infosPanneau.mode = message.toString(); 
            socket.emit(topic.split('/')[3],message.toString());   
          }
          break;
        case "melangeur":
          break;
        case "balance":
          if(topic.split('/')[2] == "etats"){
            if(topic.split('/')[3] == "poids")
              infosBalance.poids = message.toString();
            else if(topic.split('/')[3] == "tare")
              infosBalance.tare = message.toString();
            else if(topic.split('/')[3] == "unit")
              infosBalance.unit = message.toString();
            else if(topic.split('/')[3] == "erreur")
              infosBalance.erreur = message.toString();
            socket.emit(topic.split('/')[3],message.toString());
            //socket.emit('refreshPage','refreshPage');
          }
          break;
        case "powermeter":
          if(topic.split('/')[2] == "etats"){
            if(topic.split('/')[3] == "vab")
              infosPowerMeter.vab = message.toString();
            else if(topic.split('/')[3] == "vbn")
              infosPowerMeter.vbn = message.toString();
            else if(topic.split('/')[3] == "vab")
              infosPowerMeter.vab = message.toString();
            else if(topic.split('/')[3] == "erreur")
              infosPowerMeter.erreur = message.toString();
            socket.emit(topic.split('/')[3],message.toString());
            //socket.emit('refreshPage','refreshPage');
          }
          break;
        case "alarmes":
          console.log("ALARME");
          if(topic.split('/')[2] == "etats" && message.toString() == "ON"){
            if(topic.split('/')[3] == "ALR_GB_OVF")
              alarmesActives.debordementGB = 1;
            if(topic.split('/')[3] == "ALR_PB_OVF")
              alarmesActives.debordementPB = 1; 
            if(topic.split('/')[3] == "ALR_GB_NIV_MAX")
              alarmesActives.limiteHauteGB = 1; 
            if(topic.split('/')[3] == "ALR_PB_NIV_MAX")
              alarmesActives.limiteHautePB = 1; 
            if(topic.split('/')[3] == "ALR_CNX_BAL")
              alarmesActives.timeoutBalance = 1; 
            if(topic.split('/')[3] == "ALR_CNX_POW")
              alarmesActives.timeoutPowermeter = 1;  
          }
          socket.emit(topic.split('/')[3],message.toString());
          socket.emit("alerteAlarme","Vous avez une nouvelle alarme:" + topic.split('/')[3] + " Veuillez l'acquitter dans la page d'alarmes");   
          break;
        default:
          break;
      }
    }
    //socket.emit('refreshPage','refreshPage');
  });

  //ACK des alarmes
  socket.on('ackAlarme', function(message) {
    var topic = "";
    switch(message.split('/')[0])
    {
      case "balance":
        alarmesActives.timeoutBalance = 0; 
        socket.emit("ALR_CNX_BAL","ACK");
        topic = 'RAM/alarmes/etats/ALR_CNX_BAL';
        break;
      case "powermeter":
        alarmesActives.timeoutPowermeter = 0;
        socket.emit("ALR_CNX_POW","ACK");
        topic = 'RAM/alarmes/etats/ALR_CNX_POW';
        break;
      case "limiteHauteGB":
        socket.emit("ALR_GB_NIV_MAX","ACK");
        alarmesActives.limiteHauteGB = 0;
        topic = 'RAM/alarmes/etats/ALR_GB_NIV_MAX';
        break;
      case "limiteHautePB":
        socket.emit("ALR_PB_NIV_MAX","ACK");
        alarmesActives.limiteHautePB = 0;
        topic = 'RAM/alarmes/etats/ALR_PB_NIV_MAX';
        break;
      case "debordementGrandBassin":
        socket.emit("ALR_GB_OVF","ACK");
        alarmesActives.debordementGB = 0;
        topic = 'RAM/alarmes/etats/ALR_GB_OVF';
        break;
      case "debordementPetitBassin":
        socket.emit("ALR_PB_OVF","ACK");
        alarmesActives.debordementPB = 0;
        topic = 'RAM/alarmes/etats/ALR_PB_OVF';
        break;
    }
    addLog(message.split("/")[2], "LOG_ALARME", "ACK " + message.split("/")[0] + " Commentaire: " + message.split("/")[1]); // "userLogin/commandType/infos"
    console.log(topic);
    console.log("ACK");
    client.publish(topic,"ACK");
  });

  //consigne des alarmes
  socket.on('consigneAlarme', function(message) {
    var topic = "";
    switch(message.split("/")[0])
    {
      case "limiteHauteGrandBassin":
        topic = 'RAM/alarmes/cmd/NivLhGB';
        break;
      case "limiteHautePetitBassin":
        topic = 'RAM/alarmes/cmd/NivLhPB';
        break;
      case "tempsGenGrandBassin":
        topic = 'RAM/alarmes/cmd/TgNivGB';
        break;
      case "tempsGenGrandBassin":
        topic = 'RAM/alarmes/cmd/TgNivPB';
        break;
      case "tempsRegenGrandBassin":
        topic = 'RAM/alarmes/cmd/TrNivGB';
        break;
      case "tempsRegenPetitBassin":
        topic = 'RAM/alarmes/cmd/TrNivPB';
        break;
    }
    addLog(message.split("/")[2], "LOG_CMD", "type: " + message.split("/")[0] + " niveau: " + message.split("/")[1]); // "userLogin/commandType/infos"
    client.publish(topic, message.split("/")[1]);
  });

  //consigne panneau
  socket.on('consignePanneau', function(message) {
    var topic = "test";
    console.log(message.split("/")[0]);
    switch(message.split("/")[0])
    {
      case "mode":
        topic = "RAM/panneau/cmd/Mode";
        break;
      case "consigneNivGB":
        topic = "RAM/panneau/cmd/ConsNivGB";
        break;
      case "consigneNivPB":
        topic = "RAM/panneau/cmd/ConsNivPB";
        break;
      case "consigneTmpPB":
        topic = "RAM/panneau/cmd/ConsTmpPB";
        break;
      case "consigneValveGB":
        topic = "RAM/panneau/cmd/ValveGB";
        break;
      case "consigneValvePB":
        topic = "RAM/panneau/cmd/ValvePB";
        break;
      case "consigneValveEC":
        topic = "RAM/panneau/cmd/ValveEC";
        break;
      case "consigneValveEF":
        topic = "RAM/panneau/cmd/ValveEF";
        break;
        case "consigneValveEEC":
        topic = "RAM/panneau/cmd/ValveEEC";
        break;
      case "consigneValveEEF":
        topic = "RAM/panneau/cmd/ValveEEF";
        break;
      case "consignePompe":
        topic = "RAM/panneau/cmd/Pompe";
        break;
      default:
        topic = "RAM/error";
        break;
    }
    console.log(topic);
    addLog(message.split("/")[2], "LOG_CMD", "type: " + message.split("/")[0] + " niveau: " + message.split("/")[1]); // "userLogin/commandType/infos"
    client.publish(topic, message.split("/")[1]);
  });

  //consigne panneau
  socket.on('consigneMelangeur', function(message) {
    var topic = "test";
    console.log(message.split("/")[0]);
    switch(message.split("/")[0])
    {
      case "mode":
        topic = "RAM/melangeur/cmd/mode";
        break;
      case "consigneMoteurA":
        topic = "RAM/melangeur/cmd/motA";
        break;
      case "consigneMoteurB":
        topic = "RAM/melangeur/cmd/motB";
        break;
      case "consigneMoteurC":
        topic = "RAM/melangeur/cmd/motC";
        break;
      case "consigneRecette":
        topic = "RAM/melangeur/cmd/recette";
        break;
      case "consigneRecetteGo":
        topic = "RAM/melangeur/cmd/recetteGo";
        break;
      case "controleShopVAC":
        topic="RAM/shopvac/cmd/force";
        break;
      default:
        topic = "RAM/error";
        break;
    }
    console.log(topic);
    addLog(message.split("/")[2], "LOG_CMD", "type: " + message.split("/")[0] + " niveau: " + message.split("/")[1]); // "userLogin/commandType/infos"
    client.publish(topic, message.split("/")[1]);
  });

});
// -----------------------//

// ----------- Functions -----------//
function renderCorrectPage(req,res,pageName, requestLog = "SELECT * FROM logdata;"){
  if(req.session.user.login == '')
    res.redirect('/');
  else{
    var requestUsers =  'SELECT * FROM users WHERE login = "'+req.session.user.login+'" AND password = "'+req.session.user.password+'";';
    var requestTableUsers = 'SELECT * FROM users';
    var rowsTable;
    let logData = [];
                          
    var queryLog = connection2.query(requestLog, function(err, rows, fields1) {
      if(!err){
        logData = rows;
      }
    });
    console.table(logData);
    var queryTableUsers = connection.query(requestTableUsers, function(err, rows, fields1) {
      if(!err){
        rowsTable = rows;
      }
    });

    var queryLogin = connection.query(requestUsers, function(err, rows, fields1) {
      if(!err){
        if(rows.length >= 1){
          res.render(pageName, {infosBalance: infosBalance, infosPanneau: infosPanneau, infosPowerMeter: infosPowerMeter, niveauDroit: req.session.user.type, login: req.session.user.login, rows:rows, rowsTable: rowsTable, logData: logData, alarmesActives: alarmesActives});
        }
        else
          res.redirect("/");
      }
      else 
        res.render('pages/error'); 
    });
    
  }    
}

function addLog(userLogin, commandType, infos){
  var currentDate = new Date();

  var year = currentDate.getFullYear();
  var month = String(currentDate.getMonth() + 1).padStart(2, '0'); 
  var day = String(currentDate.getDate()).padStart(2, '0');

  var formattedDate = `${year}-${month}-${day} `;

  var currentTime = new Date();
  var options = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false, 
  };
  var formattedTime = currentTime.toLocaleString('en-US', options);
  var request = "INSERT INTO logdata (Type, UserLogin, ReqTime, Info) VALUES ('"+ commandType.toString() + "','" + userLogin.toString() + "','"+ formattedDate + formattedTime +"','"+infos.toString()+"');";
  var queryLog = connection2.query(request, function(err, result) { 
    if(!err){
      console.log("donnée ajoutée avec succès");
    }  
    else
      console.log("problème lors de l'ajout de la donnée"); 
  });
}
// -----------------------//


module.exports = router;

