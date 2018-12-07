const express = require('express');
const bodyParser = require('body-parser');
const readline = require('readline');
const colors = require('colors');
const app = express();


var errorcode = [
'ERROR 00: not receiving JWT token',
'ERROR 01: not receiving ID',
'ERROR 02: not receiving access token',
'ERROR 03: device has not communicated recently',
'ERROR 04: not receiving telemetry',
'ERROR 05: failed to set attributes',
'ERROR 06: failed to set attributes',
'ERROR 07: setting uploadFrequency',
'ERROR 08: not receiving Charging feedback',
'ERROR 09: not receiving Decharging feedback',
'ERROR 10: not receiving Decharging Feedback',
'ERROR 11: Charge test FAILED',
'ERROR 12: I-bat is fluctuating too much',
'ERROR 13: relay DC is not in right position',
'ERROR 14: not receiving telemetry',
'ERROR 15: Decharge Test FAILED',
'ERROR 16: because rLet is not in right position',
'ERROR 17: receiving telemetry',
'ERROR 18: setting ChargeState',
'ERROR 19: setting DechargeState',
'ERROR 20: setting ChargeState to OFF',
'ERROR 21: setting DechargeState to OFF',
'ERROR 22: setting uploadFrequency',
'ERROR 23: setting client_attribute to ',
'ERROR 24: getting client attribute'];

var fs = require('fs');
var clear = require('clear');
var moment = require('moment');
//clear();

var version = 'v1.0.4';
/* changed Ipv>0.55 to 0.45 and Vpv from 250 to 275*/
/* changed upv from 275 to 350*/
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});


var time_start;
var time_stop;
var time_format;


var request = require('request');
//const deviceName = process.argv[2];
var deviceName;

var host = 'thingsboard.solarlogs.be';
var username = 'ProdToolIlumen@gmail.com';
var password = 'ProductionTool123!';
var token = '';
var id;
var accesstoken;
var serverTime;
var messageTime;
var messageAge;


var boot = 1;
var I_bat_old = 0;

var U_PV;
var U_bat;

var firmware;
var firmware_wifi;


var value = {
  ts: '',
  values:
  {
    U_PV:'' ,
    U_bat:'' ,
    I_PV:'' ,
    I_bat:''
  }

};

var logger;

var user = {
	'username': username,
	'password': password
};

var setMaxPower = {
	'method': 'setMaxPower',
	'params': 10000
};

var setChargingPower = {
	'method': 'setChargingPower',
	'params': 190
};

var setChargeStateOn = {
	'method': 'setChargeState',
	'params': true
};

var setChargeStateOff = {
	'method': 'setChargeState',
	'params': false
};

var setDechargeStateOn = {
	'method': 'setDechargeState',
	'params': true
};

var setDechargeStateOff = {
	'method': 'setDechargeState',
	'params': false
};

var shared_attributes_on = {
	'uploadFrequency': 1
};

var shared_attributes_off = {
	'uploadFrequency': 10
};

var client_attributes_ProdTest = {
	'prod_test': 'FAILED',
  'prod_test_SW': version
};

var filename = '';
var time_start;

var messageId = 0;
var errorId = 0;
var succesId = 0;
var barId = 0;
var message_ = {};  // <- Keep a map of attached clients
var error_ = {};  // <- Keep a map of attached clients
var succes_ = {};  // <- Keep a map of attached clients
var bar_ = {};  // <- Keep a map of attached clients

var timeoutcharge = [];


app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs')

app.get('/', function (req, res) {
  //res.render('index', {message: null, error: null});
  res.render('index');
  //res.end();

});

// Called once for each new client. Note, this response is left open!
app.get('/message/', function(req, res) {
	req.socket.setTimeout(Number.MAX_VALUE);
    res.writeHead(200, {
    	'Content-Type': 'text/event-stream',  // <- Important headers
    	'Cache-Control': 'no-cache',
    	'Connection': 'keep-alive'
    });
    res.write('\n');
    (function(messageId) {
        message_[messageId] = res;  // <- Add this client to those we consider "attached"
        req.on("close", function(){delete message_[messageId]});  // <- Remove this client when he disconnects
    })(++messageId)
});

// Called once for each new client. Note, this response is left open!
app.get('/error/', function(req, res) {
	req.socket.setTimeout(Number.MAX_VALUE);
    res.writeHead(200, {
    	'Content-Type': 'text/event-stream',  // <- Important headers
    	'Cache-Control': 'no-cache',
    	'Connection': 'keep-alive'
    });
    res.write('\n');
    (function(errorId) {
        error_[errorId] = res;  // <- Add this client to those we consider "attached"
        req.on("close", function(){delete error_[errorId]});  // <- Remove this client when he disconnects
    })(++errorId)
});

// Called once for each new client. Note, this response is left open!
app.get('/succes/', function(req, res) {
	req.socket.setTimeout(Number.MAX_VALUE);
    res.writeHead(200, {
    	'Content-Type': 'text/event-stream',  // <- Important headers
    	'Cache-Control': 'no-cache',
    	'Connection': 'keep-alive'
    });
    res.write('\n');
    (function(succesId) {
        succes_[succesId] = res;  // <- Add this client to those we consider "attached"
        req.on("close", function(){delete succes_[succesId]});  // <- Remove this client when he disconnects
    })(++succesId)
});

// Called once for each new client. Note, this response is left open!
app.get('/bar/', function(req, res) {
	req.socket.setTimeout(Number.MAX_VALUE);
    res.writeHead(200, {
    	'Content-Type': 'text/event-stream',  // <- Important headers
    	'Cache-Control': 'no-cache',
    	'Connection': 'keep-alive'
    });
    res.write('\n');
    (function(barId) {
        bar_[barId] = res;  // <- Add this client to those we consider "attached"
        req.on("close", function(){delete bar_[barId]});  // <- Remove this client when he disconnects
    })(++barId)
});



app.post('/', function (req, res) {
  res.render('index');
  res.end();
  let serialNumber = req.body.serialNumber;
  console.log(serialNumber);
  askSN(serialNumber);
  let message = '';






  //deviceName = '20180300095';


  function askSN(serialNumber){
    if(serialNumber === undefined)
    {
      rl.question('Serialnumber? ', function(dName) {
        // TODO: Log the answer in a database
        //console.log(dNAme);

        deviceName = dName;
        var dir = './logs/' + deviceName;
        if (!fs.existsSync(dir))
        {
          fs.mkdirSync(dir);
        }

        if (deviceName !== undefined)
        {
          time_start = moment();

          filename = dir + '/' + deviceName + '_' + time_start.format('YYYY-MM-DD__HH-mm-ss');
          logger = fs.createWriteStream(filename + '.log', {
            //flags: 'a' // 'a' means appending (old data will be preserved)
          });
          logger.write('Serialnumber '+ deviceName +'\n');
          console.log(time_start.format('YYYY-MM-DD HH:mm:ss Z'));
          logger.write(time_start.format('YYYY-MM-DD HH:mm:ss Z') + '\n\n');
          //logger.write(time_format + '\n');
          //logger.write(timestamp +'\n');
          logbook = fs.createWriteStream('logs/logbook/' + time_start.format('YYYY-MM-DD')+'.log', {
            flags: 'a' // 'a' means appending (old data will be preserved)
          });
          logbook.write(time_start.format('YYYY-MM-DD HH:mm:ss Z') + '\tSN\t'+ deviceName + '\tTEST STARTED\t'+'\n');

        }
        //console.log(deviceName);

        getToken();
        rl.close();
      });
    }
    else{

      deviceName = serialNumber;
      var dir = './logs/' + deviceName;
      if (!fs.existsSync(dir))
      {
        fs.mkdirSync(dir);
      }

      if (deviceName !== undefined)
      {
        time_start = moment();
        filename = dir + '/' + deviceName + '_' + time_start.format('YYYY-MM-DD__HH-mm-ss');
        logger = fs.createWriteStream(filename + '.log', {
          //flags: 'a' // 'a' means appending (old data will be preserved)
        });
        logger.write('Serialnumber '+ deviceName +'\n');
        console.log(time_start.format('YYYY-MM-DD HH:mm:ss Z'));
        logger.write(time_start.format('YYYY-MM-DD HH:mm:ss Z') + '\n\n');
        //logger.write(time_format + '\n');
        //logger.write(timestamp +'\n');
        logbook = fs.createWriteStream('logs/logbook/' + time_start.format('YYYY-MM-DD')+'.log', {
          flags: 'a' // 'a' means appending (old data will be preserved)
        });
        logbook.write(time_start.format('YYYY-MM-DD HH:mm:ss Z') + '\tSN\t'+ deviceName + '\tTEST STARTED\t'+'\n');


      }
      //console.log(deviceName);
      getToken();
    }
  }

  function publishMessage(msg)
  {
  	console.log("Message: " + Object.keys(message_) + " <- " + msg);
  	for (messageID in message_)
    {
  		message_[messageID].write("data: "+ msg + "\n\n"); // <- Push a message to a single attached client
  	};
  }

  function publishError(msg)
  {
    console.log("Error: " + Object.keys(error_) + " <- " + msg);
    for (errorID in error_)
    {
      error_[errorID].write("data: "+ msg + "\n\n"); // <- Push a message to a single attached client
    };
  }

  function publishSucces(msg)
  {
    console.log("Succes: " + Object.keys(succes_) + " <- " + msg);
    for (succesID in succes_)
    {
      succes_[succesID].write("data: "+ msg + "\n\n"); // <- Push a message to a single attached client
    };
  }

  function publishBar(msg)
  {
    //console.log("BAR: " + Object.keys(bar_) + " <- " + msg);
    for (barID in bar_)
    {
      bar_[barID].write("data: "+ msg + "\n\n"); // <- Push a message to a single attached client
    };
  }

  function getToken()
  {
    console.log('----------------------------------------------------------\nTest started');
    logger.write('Test started \n\n');

    var options_getToken = {
    	method: 'post',
    	url: 'http://' + host + '/api/auth/login',
    	headers: {
    		'Content-Type': 'application/json',
    		'Accept': 'application/json',
    	},
    	body: JSON.stringify(user),
      timeout: 10000
    };

    request(options_getToken, function(error, response, body) {


      //console.log(token.length);
      if(response && response.statusCode == 200)
      {
        obj = JSON.parse(body);
        token = obj.token;
        console.log('Succesfully received JWT token'.green);
        logger.write('Succesfully received JWT token \n');
        //res.render('index', {message: 'Test started for ' + serialNumber, error: null});
        publishMessage('Tester: ' + version + ' :started for device ' + deviceName);

        //res.end();
        getDeviceID();
      }
      else
      {
        //res.render('index', {message: null, error: 'ERROR receiving JWT token'});
        client_attributes_ProdTest.prod_test = 'FAILED';
        setClientAttrProdTest();
        console.log(errorcode[0].red);
        logger.write('ERROR receiving JWT token \n');
        publishError(errorcode[0]);
        time_stop = moment();
        logbook.write(time_stop.format('YYYY-MM-DD HH:mm:ss Z') + '\tSN\t'+ deviceName + '\tTEST FAILED\t'+'\n');
        //res.render('index', {message: null, error: 'Test FAILED for ' + serialNumber});
        //res.end();
        ////process.exit(0);

      }


    })
  }

  function getDeviceID()
  {
    console.log('Getting device ID for serialnumber ' + deviceName);
    logger.write('Getting device ID for serialnumber '+ deviceName + '\n');
    var options_getDeviceID = {
  				method: 'get',
  				url: 'http://' + host + '/api/tenant/devices?deviceName=' + deviceName,
  				headers: {
  					'Content-Type': 'application/json',
  					'Accept': 'application/json',
  					'X-Authorization': 'Bearer ' + token
  				},
          timeout: 10000
  				//body: JSON.stringify(user),
  	};
    request(options_getDeviceID, function(error, response, body)
    {
  	   if(response && response.statusCode == 200)
  		 {
         obj = JSON.parse(body);
         //console.log(obj);
         id = obj.id.id;

         console.log('Succesfully received ID'.green);
         logger.write('Succesfully received ID \n');
         console.log('ID: ' + id);
         logger.write('ID: ' + id + '\n');
         getAccessToken();
       }

       else
       {
         client_attributes_ProdTest.prod_test = 'FAILED';
         setClientAttrProdTest();
         console.log('ERROR receiving ID'.red);
         logger.write('ERROR receiving ID \n');
         publishError(errorcode[1]);
         time_stop = moment();
         logbook.write(time_stop.format('YYYY-MM-DD HH:mm:ss Z') + '\tSN\t'+ deviceName + '\tTEST FAILED\t'+'\n');
         //res.render('index', {message: null, error: 'Test FAILED for ' + serialNumber});
         //res.end();
         ////process.exit(0);

       }
    });
  }

  function getAccessToken()
  {
    console.log('Getting access token for serialnumber ' + deviceName);
    logger.write('Getting access token for serialnumber '+ deviceName + '\n');
    var options_getAccessToken = {
  				method: 'get',
  				url: 'http://' + host + '/api/device/' + id + '/credentials',
  				headers: {
  					'Content-Type': 'application/json',
  					'Accept': 'application/json',
  					'X-Authorization': 'Bearer ' + token
  				},
          timeout: 10000
  				//body: JSON.stringify(user),
  	};
    request(options_getAccessToken, function(error, response, body)
    {
  	   if(response && response.statusCode == 200)
  		 {
         obj = JSON.parse(body);
         //console.log(obj);
         accesstoken = obj.credentialsId;
         console.log('Succesfully received Access Token'.green);
         logger.write('Succesfully received Access Token \n');
         console.log('Access Token: ' + accesstoken);
         logger.write('Access Token: ' + accesstoken + '\n');

         checkCommunication();
         getClientAttr('');
       }

       else
       {
         client_attributes_ProdTest.prod_test = 'FAILED';
         setClientAttrProdTest();
         console.log('ERROR receiving access token'.red);
         logger.write('ERROR receiving access token \n');
         publishError(errorcode[2]);
         time_stop = moment();
         logbook.write(time_stop.format('YYYY-MM-DD HH:mm:ss Z') + '\tSN\t'+ deviceName + '\tTEST FAILED\t'+'\n');
         //res.render('index', {message: null, error: 'Test FAILED for ' + serialNumber});
         //res.end();
         ////process.exit(0);

       }
    });
  }



  function checkCommunication()
  {
    var options_getServerTime =
    {
  				method: 'get',
  				url: 'http://' + host + '/api/dashboard/serverTime',
  				headers: {
  					'Content-Type': 'application/json',
  					'Accept': 'application/json',
  					'X-Authorization': 'Bearer ' + token
  				},
          timeout: 10000
    }
    request(options_getServerTime, function(error, response, body)
    {
      if(response && response.statusCode == 200)
      {
        obj = JSON.parse(body);
        serverTime = body;
      }
      else
      {
        client_attributes_ProdTest.prod_test = 'FAILED';
        setClientAttrProdTest();
        console.log('ERROR getting serverTime'.red);
        logger.write('ERROR getting serverTime \n');
        publishError('ERROR getting serverTime');
        //res.render('index', {message: null, error: 'Test FAILED for ' + serialNumber});
        //res.end();
        time_stop = moment();
        logbook.write(time_stop.format('YYYY-MM-DD HH:mm:ss Z') + '\tSN\t'+ deviceName + '\tTEST FAILED\t'+'\n');
        ////process.exit(0);
      }
    });

    var options_getLatestValue =
    {
          method: 'get',
          url: 'http://' + host + '/api/plugins/telemetry/DEVICE/' + id + '/values/timeseries?keys=U_PV',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Authorization': 'Bearer ' + token
          },
          timeout: 10000
    }
    request(options_getLatestValue, function(error, response, body)
    {
      if(response && response.statusCode == 200)
      {
  	   obj = JSON.parse(body);
       //console.log(body);
       messageTime = obj["U_PV"][0]["ts"];
       messageAge = (serverTime - messageTime)/1000;
       //console.log(messageTime);
       console.log('latest message is ' + messageAge +'s old');
       logger.write('latest message is ' + messageAge +'s old \n');
       if(Math.abs(messageAge) < 65)
       {
         console.log('Device '.green+ deviceName.blue+' is communicating properly'.green);
         logger.write('Device '+ deviceName+' is communicating properly \n');
         publishMessage('Device '+ deviceName+' is communicating properly on tester: ' + version);
         getLatestValue('U_PV','U_bat','I_PV','I_bat','rDC','rLet');

       }
       else
       {
         client_attributes_ProdTest.prod_test = 'FAILED';
         setClientAttrProdTest();
         console.log('ERROR device has not communicated recently'.red);
         logger.write('ERROR device has not communicated recently \n');
         publishError(errorcode[3]);
         time_stop = moment();
         logbook.write(time_stop.format('YYYY-MM-DD HH:mm:ss Z') + '\tSN\t'+ deviceName + '\tTEST FAILED\t'+'\n');
         //res.render('index', {message: null, error: 'Test FAILED for ' + serialNumber});
         //res.end();
         ////process.exit(0);
       }
     }
     else {
       client_attributes_ProdTest.prod_test = 'FAILED';
       setClientAttrProdTest();
       console.log('something is wrong ...');
       //res.render('index', {message: null, error: 'Test FAILED for ' + serialNumber});
       //res.end();
       ////process.exit(0);
     }
     });
  }

  function getLatestValue(key1, key2, key3, key4, key5, key6)
  {
    var options_getLatestValue =
    {
          method: 'get',
          url: 'http://' + host + '/api/plugins/telemetry/DEVICE/' + id + '/values/timeseries?keys=' + key1 + ',' + key2 + ',' + key3 + ',' + key4 + ',' + key5 + ',' + key6,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Authorization': 'Bearer ' + token
          },
          timeout: 10000
    }

    request(options_getLatestValue, function(error, response, body)
    {

       if(response && response.statusCode == 200)
       {
         obj = JSON.parse(body);
         value.ts = obj[key1][0]["ts"];
         value.values.U_PV = obj[key1][0]["value"];
         value.values.U_bat = obj[key2][0]["value"];
         value.values.I_PV = obj[key3][0]["value"];
         value.values.I_bat = obj[key4][0]["value"];
         value.values.rDC = obj[key5][0]["value"];
         value.values.rLet = obj[key6][0]["value"];
         console.log('Succesfully received telemetry'.green);
         logger.write('Succesfully received telemetry \n');
         processInitialTelemetry();

         //console.log(value);
       }
       else {
         client_attributes_ProdTest.prod_test = 'FAILED';
         setClientAttrProdTest();
         console.log('FAILED receiving telemetry'.red);
         logger.write('FAILED receiving telemetry \n');
         publishError(errorcode[4]);
         time_stop = moment();
         logbook.write(time_stop.format('YYYY-MM-DD HH:mm:ss Z') + '\tSN\t'+ deviceName + '\tTEST FAILED\t'+'\n');
         //res.render('index', {message: null, error: 'Test FAILED for ' + serialNumber});
         //res.end();
         ////process.exit(0);
       }

     });


  }

  function processInitialTelemetry()
  {
    if(value.values.U_PV < 315 && value.values.U_PV > 300 && value.values.U_bat < 30 && value.values.U_bat > 23 && value.values.I_PV == 0 && value.values.I_bat == 0 && value.values.rDC == 0 && value.values.rLet == 0)
    {
      console.log('Intial telemetry seems to be fine'.green);
      logger.write('Intial telemetry seems to be fine \n');
      setAttributes();
      client_attributes_ProdTest.prod_test = 'TESTING';
      setTimeout( function timer()
      {setClientAttrProdTest();},50);
    }
    else {
      client_attributes_ProdTest.prod_test = 'FAILED';
      setClientAttrProdTest();
      console.log('Initial telemetry not within threshold'.red);
      logger.write('Initial telemetry not within threshold \n');
      publishError('Initial telemetry not withing threshold');
      time_stop = moment();
      logbook.write(time_stop.format('YYYY-MM-DD HH:mm:ss Z') + '\tSN\t'+ deviceName + '\tTEST FAILED\t'+'\n');
      //res.render('index', {message: null, error: 'Test FAILED for ' + serialNumber});
      //res.end();
      ////process.exit(0);
    }
  }

  function setAttributes()
  {
    var options_setMaxPower = {
          method: 'post',
          url: 'http://' + host + '/api/plugins/rpc/twoway/' + id,
          headers: {
            'Content-Type': 'application/json',
            //'Accept': 'application/json',
            'X-Authorization': 'Bearer ' + token
          },
          body: JSON.stringify(setMaxPower),
          timeout: 10000
    };
    request(options_setMaxPower, function(error, response, body)
    {
       if(response && response.statusCode == 200)
       {
         obj = JSON.parse(body);
         console.log('Set Inverter Power to '+ body.blue +'W');
         logger.write('Set Inverter Power to '+ body +'W \n');
         var options_setChargingPower = {
               method: 'post',
               url: 'http://' + host + '/api/plugins/rpc/twoway/' + id,
               headers: {
                 'Content-Type': 'application/json',
                 //'Accept': 'application/json',
                 'X-Authorization': 'Bearer ' + token
               },
               body: JSON.stringify(setChargingPower),
               timeout: 10000
         };
         request(options_setChargingPower, function(error, response, body)
         {

            if(response && response.statusCode == 200)
            {
              obj = JSON.parse(body);
              console.log('Set Charging Power to '+ body.blue +'W');
              logger.write('Set Charging Power to '+ body +'W \n');
              //WaitForBoot();
              setTimeout( function timer()
              {
                ChargeNowOn();
                I_bat_old = 0;

              },2000)
            }
            else {
              client_attributes_ProdTest.prod_test = 'FAILED';
              setClientAttrProdTest();
              console.log('Something went wrong setting the attributes'.red);
              logger.write('Something went wrong setting the attributes \n');
              time_stop = moment();
              logbook.write(time_stop.format('YYYY-MM-DD HH:mm:ss Z') + '\tSN\t'+ deviceName + '\tTEST FAILED\t'+'\n');
              publishError(errorcode[5]);
              //res.render('index', {message: null, error: 'Test FAILED for ' + serialNumber});
              //res.end();
              ////process.exit(0);
            }


          });
       }
       else {
         client_attributes_ProdTest.prod_test = 'FAILED';
         setClientAttrProdTest();
         console.log('ERROR setting the attributes'.red);
         logger.write('ERROR setting the attributes \n');
         time_stop = moment();
         logbook.write(time_stop.format('YYYY-MM-DD HH:mm:ss Z') + '\tSN\t'+ deviceName + '\tTEST FAILED\t'+'\n');
         publishError(errorcode[6]);

         //res.render('index', {message: null, error: 'Test FAILED for ' + serialNumber});
         //res.end();
         ////process.exit(0);
       }

     });

     setTimeout( function timer()
     {
       var options_postSharedAtt = {
         method: 'post',
         url: 'http://' + host + '/api/plugins/telemetry/DEVICE/' + id + '/SHARED_SCOPE',
         headers: {
           'Content-Type': 'application/json',
           'Accept': 'application/json',
           'X-Authorization': 'Bearer ' + token
         },
         body: JSON.stringify(shared_attributes_on),
         timeout: 10000
         };
         request(options_postSharedAtt, function(error, response, body) {
           if(response && response.statusCode == 200)
           {
             console.log('Succes setting uploadFrequency to '.green + shared_attributes_on.uploadFrequency );
             logger.write('Succes setting uploadFrequency to ' + shared_attributes_on.uploadFrequency +'\n')
           }
           else
           {
             client_attributes_ProdTest.prod_test = 'FAILED';
             setClientAttrProdTest();
             console.log('error setting uploadFrequency'.red);
             logger.write('error setting uploadFrequency \n');
             time_stop = moment();
             logbook.write(time_stop.format('YYYY-MM-DD HH:mm:ss Z') + '\tSN\t'+ deviceName + '\tTEST FAILED\t'+'\n');
             publishError(errorcode[7]);
             //res.render('index', {message: null, error: 'Test FAILED for ' + serialNumber});
             //res.end();
             ////process.exit(0);
           }
         });
       },1000);


  }

  function WaitForCharge()
  {
    setTimeout( function timer()
    {

      var options_getLatestValue =
      {
            method: 'get',
            url: 'http://' + host + '/api/plugins/telemetry/DEVICE/' + id + '/values/timeseries?keys=' + 'rDC',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'X-Authorization': 'Bearer ' + token
            },
            timeout: 10000
      }

      request(options_getLatestValue, function(error, response, body)
      {
          if(response && response.statusCode == 200)
          {
            obj = JSON.parse(body);
             if(response && response.statusCode == 200 && obj['rDC'][0]["value"] == 1)
             {

               console.log('Charging feedback received'.green);
               logger.write('Charging feedback received \n');
               monitorTelemetryCharge();
               publishMessage('Busy monitoring charge process, please wait...')
             }
             else {
               client_attributes_ProdTest.prod_test = 'FAILED';
               setClientAttrProdTest();
               console.log('FAILED receiving Charging feedback'.red);
               logger.write('FAILED receiving Charging feedback \n');
               time_stop = moment();
               logbook.write(time_stop.format('YYYY-MM-DD HH:mm:ss Z') + '\tSN\t'+ deviceName + '\tTEST FAILED\t'+'\n');
               ChargeNowOff();
               publishError('FAILED receiving Charging Feedback');
               //res.render('index', {message: null, error: 'Test FAILED for ' + serialNumber});
               //res.end();
               ////process.exit(0);
             }
           }
           else{
             client_attributes_ProdTest.prod_test = 'FAILED';
             setClientAttrProdTest();
             console.log('FAILED receiving Charging feedback'.red);
             logger.write('FAILED receiving Charging feedback \n');
             time_stop = moment();
             logbook.write(time_stop.format('YYYY-MM-DD HH:mm:ss Z') + '\tSN\t'+ deviceName + '\tTEST FAILED\t'+'\n');
             publishError(errorcode[8]);
             //res.render('index', {message: null, error: 'Test FAILED for ' + serialNumber});
             //res.end();
             ////process.exit(0);
           }

       });
    }, 5000);

  }

  function WaitForDecharge()
  {
    setTimeout( function timer()
    {

      var options_getLatestValue =
      {
            method: 'get',
            url: 'http://' + host + '/api/plugins/telemetry/DEVICE/' + id + '/values/timeseries?keys=' + 'rLet',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'X-Authorization': 'Bearer ' + token
            },
            timeout: 10000
      }

      request(options_getLatestValue, function(error, response, body)
      {
        if(response && response.statusCode == 200)
        {
          obj = JSON.parse(body);
          if(response && response.statusCode == 200 && obj['rLet'][0]["value"] == 1)
          {

            console.log('Decharging feedback received'.green);
            logger.write('Decharging feedback received \n');
            monitorTelemetryDecharge();
            publishMessage('Busy monitoring discharge process, please wait...')
          }
          else {
            client_attributes_ProdTest.prod_test = 'FAILED';
            setClientAttrProdTest();
            console.log('FAILED receiving Decharging feedback'.red);
            logger.write('FAILED receiving Decharging feedback \n');
            time_stop = moment();
            logbook.write(time_stop.format('YYYY-MM-DD HH:mm:ss Z') + '\tSN\t'+ deviceName + '\tTEST FAILED\t'+'\n');
            publishError(errorcode[9]);
            //res.render('index', {message: null, error: 'Test FAILED for ' + serialNumber});
            //res.end();
            DechargeNowOff();
            ////process.exit(0);
          }
        }
        else {
          client_attributes_ProdTest.prod_test = 'FAILED';
          setClientAttrProdTest();
          console.log('FAILED receiving Decharging feedback'.red);
          logger.write('FAILED receiving Decharging feedback \n');
          time_stop = moment();
          logbook.write(time_stop.format('YYYY-MM-DD HH:mm:ss Z') + '\tSN\t'+ deviceName + '\tTEST FAILED\t'+'\n');
          DechargeNowOff();
          publishError(errorcode[10]);
          //res.render('index', {message: null, error: 'Test FAILED for ' + serialNumber});
          //res.end();
          ////process.exit(0);
        }


       });
    }, 5000);

  }

  function monitorTelemetryCharge()
  {
    var counter = 0;
    var amount = 30;
    var no_errors = true;



    var timeoutFunction = function(i) {

        return function()
        {
          counter++;

          publishBar(counter*100/45);

          if(no_errors == true)
          {
            timeout = setTimeout(timeoutFunction(i+1), 5000);
          }

          for (k=0; k<= (amount/5)-1; k++)
          {
            if (counter == k*5)
            {
              var difference = amount - counter;
              //publishMessage('Still ' + difference +' cycles to go, please wait...');
            }
          }





          if (counter == amount && value.values.U_PV > 300 && value.values.U_PV < 317 && value.values.U_bat > 25 && value.values.U_bat < 30.5
              && value.values.I_bat > 6.0 && value.values.I_bat < 8 && value.values.I_PV < 0.8 && value.values.I_PV > 0.40 && value.values.U_bat * value.values.I_bat > 150 && value.values.U_bat * value.values.I_bat <= 200)
          {
            no_errors = false;
            clearTimeout(timeout);
              setTimeout( function timer()
              {
                ChargeNowOff();
                console.log('Charge Test Succesfull'.green);
                logger.write('Charge Test Succesfull \n');
                publishMessage('Charge Test Succesfull');


                setTimeout( function timer2()
                {
                  ////res.render('index', {message: 'Testing Discharger', error: null});
                  DechargeNowOn();
                },5000);
              }, 100);

            }
            else if (counter == amount)
            {
              no_errors = false;
              clearTimeout(timeout);
              setTimeout( function timer()
              {
                ChargeNowOff();
                client_attributes_ProdTest.prod_test = 'FAILED';
                setClientAttrProdTest();
                console.log('Charge Test FAILED'.red);
                logger.write('Charge Test FAILED \n');
                time_stop = moment();
                logbook.write(time_stop.format('YYYY-MM-DD HH:mm:ss Z') + '\tSN\t'+ deviceName + '\tTEST FAILED\t'+'\n');
                publishError(errorcode[11]);
                //break;
                //process.exit(0);
                //res.render('index', {message: null, error: 'Test FAILED for ' + serialNumber});
                //res.end();
              }, 100);
            }



            var options_getLatestValue =
            {
                  method: 'get',
                  url: 'http://' + host + '/api/plugins/telemetry/DEVICE/' + id + '/values/timeseries?keys=' + 'U_PV' + ',' + 'U_bat' + ',' + 'I_PV' + ','
                  + 'I_bat' + ',' + 'rDC' + ',' + 'rLet',
                  headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Authorization': 'Bearer ' + token
                  },
                  timeout: 10000
            }

            request(options_getLatestValue, function(error, response, body)
            {


               //console.log(body);
               if(response && response.statusCode == 200)
               {

                 obj = JSON.parse(body);
                 value.ts = obj['U_PV'][0]["ts"];
                 value.values.U_PV = obj['U_PV'][0]["value"];
                 value.values.U_bat = obj['U_bat'][0]["value"];
                 value.values.I_PV = obj['I_PV'][0]["value"];
                 value.values.I_bat = obj['I_bat'][0]["value"];
                 value.values.rDC = obj['rDC'][0]["value"];
                 value.values.rLet = obj['rLet'][0]["value"];
                 //console.log('Succesfully received telemetry'.green);
                 console.log(counter + ' ' + JSON.stringify(value));
                 logger.write(counter + ' ' + JSON.stringify(value) + '\n');
                 var difference = 0;
                 difference = value.values.I_bat - I_bat_old;
                 //console.log('diff: '  + Math.abs(difference));
                 //console.log('I_bat:\t'+value.values.I_bat+'\tI_bat_old:\t'+I_bat_old)
                 if(Math.abs(difference) > 5)
                 {
                   client_attributes_ProdTest.prod_test = 'FAILED';
                   ChargeNowOff();
                   setTimeout( function timer()
                   {
                     setClientAttrProdTest();
                   },100);
                   console.log('FAILED because I_bat is fluctuating too much'.red);
                   logger.write('FAILED because I_bat is fluctuating too much \n');
                   time_stop = moment();
                   logbook.write(time_stop.format('YYYY-MM-DD HH:mm:ss Z') + '\tSN\t'+ deviceName + '\tTEST FAILED\t'+'\n');
                   no_errors = false;
                   clearTimeout(timeout);
                   publishError(errorcode[12]);
                   //break;
                   //res.render('index', {message: null, error: 'Test FAILED for ' + serialNumber});
                   //res.end();
                 }

                 if(value.values.rDC == 0)
                 {
                   client_attributes_ProdTest.prod_test = 'FAILED';
                   //setClientAttrProdTest();
                   console.log('FAILED because rDC is not in right position'.red);
                   logger.write('FAILED because rDC is not in right position \n');
                   time_stop = moment();
                   logbook.write(time_stop.format('YYYY-MM-DD HH:mm:ss Z') + '\tSN\t'+ deviceName + '\tTEST FAILED\t'+'\n');
                   publishError(errorcode[13]);
                   ChargeNowOff();
                   setTimeout( function timer()
                   {
                     setClientAttrProdTest();
                   },100);
                   no_errors = false;
                   clearTimeout(timeout);
                   //break;
                   //res.render('index', {message: null, error: 'Test FAILED for ' + serialNumber});
                   //res.end();
                   //process.exit(0);
                 }
                 setTimeout( function timer()
                 {
                   I_bat_old = value.values.I_bat;
                 },20);


               }
               else {
                 client_attributes_ProdTest.prod_test = 'FAILED';
                 //setClientAttrProdTest();
                 console.log('FAILED receiving telemetry'.red);
                 logger.write('FAILED receiving telemetry \n');
                 time_stop = moment();
                 logbook.write(time_stop.format('YYYY-MM-DD HH:mm:ss Z') + '\tSN\t'+ deviceName + '\tTEST FAILED\t'+'\n');
                 publishError(errorcode[14]);
                 ChargeNowOff();
                 setTimeout( function timer()
                 {
                   setClientAttrProdTest();
                 },100);
                 no_errors = false;
                 clearTimeout(timeout);

               }

             });


           }
         }
         var timeout = setTimeout(timeoutFunction(0), 5000);

  }

  function monitorTelemetryDecharge()
  {
    var counter = 0;
    var amount = 15;
    var no_errors = true;

    var timeoutFunction = function(i) {

        return function()
        {
          counter++;

          publishBar((30+counter)*100/45);

          if(no_errors == true)
          {
            timeout = setTimeout(timeoutFunction(i+1), 5000);
          }

          for (k=0; k<= (amount/5)-1; k++)
          {
            if (counter == k*5)
            {
              var difference = amount - counter;
              //publishMessage('Still ' + difference +' cycles to go, please wait...');
            }
          }

          if (counter == amount && value.values.U_PV > 200 && value.values.U_PV <350 && value.values.U_bat > 22 && value.values.U_bat < 26
            && value.values.I_bat > -10 && value.values.I_bat < -7 && value.values.I_PV < 1 && value.values.I_PV > 0.45)
          {
            no_errors = false;
            clearTimeout(timeout);

            client_attributes_ProdTest.prod_test = 'PASSED';
            setTimeout( function timer()
            {
              DechargeNowOff();
              setSharedAttrOff();

              setClientAttrProdTest();
              time_stop = moment();

              console.log('Decharge Test Succesfull'.green);
              console.log('\n');
              console.log('ALL TESTS ARE OK, PRODUCT IS PASSED \n\n'.green);
              console.log(time_stop.format('YYYY-MM-DD HH:mm:ss').blue);
              console.log('this test took ' + (time_stop - time_start)/1000 + 's to complete');
              logger.write('Decharge Test Succesfull \n');
              logger.write('\n');
              logger.write('ALL TESTS ARE OK, PRODUCT IS PASSED \n\n');
              logger.write(time_stop.format('YYYY-MM-DD HH:mm:ss'));
              logger.write('\n');
              logger.write('this test took ' + (time_stop - time_start)/1000 + 's to complete \n\n');
              logbook.write(time_stop.format('YYYY-MM-DD HH:mm:ss Z') + '\tSN\t'+ deviceName + '\tTEST PASSED\t'+'\n');
              publishMessage('Decharge Test Succesfull');
              publishSucces('ALL TESTS ARE OK, PRODUCT '+deviceName+' IS PASSED');

              //res.render('index', {message: 'ALL TESTS ARE OK, PRODUCT IS PASSED', error: null});
              setTimeout( function timer3()
              {
                //startTest();
                fs.rename(filename + '.log', filename + '-PASSED.log' , function (err)
                {
                  if (err) throw err;
                });
              }, 10)
              //logger.close();
            }, 100);

          }
          else if (counter == amount)
          {
            no_errors = false;
            clearTimeout(timeout);
            setTimeout( function timer()
            {
              DechargeNowOff();
              client_attributes_ProdTest.prod_test = 'FAILED';
              setClientAttrProdTest();
              console.log('Decharge Test FAILED'.red);
              logger.write('Decharge Test FAILED \n');
              time_stop = moment();
              logbook.write(time_stop.format('YYYY-MM-DD HH:mm:ss Z') + '\tSN\t'+ deviceName + '\tTEST FAILED\t'+'\n');

              publishError(errorcode[15]);
            }, 100);
          }

          var options_getLatestValue =
          {
                method: 'get',
                url: 'http://' + host + '/api/plugins/telemetry/DEVICE/' + id + '/values/timeseries?keys=' + 'U_PV' + ',' + 'U_bat' + ',' + 'I_PV' + ','
                + 'I_bat' + ',' + 'rDC' + ',' + 'rLet',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                  'X-Authorization': 'Bearer ' + token
                },
                timeout: 10000
          }

          request(options_getLatestValue, function(error, response, body)
          {

             if(response && response.statusCode == 200)
             {
               obj = JSON.parse(body);
               value.ts = obj['U_PV'][0]["ts"];
               value.values.U_PV = obj['U_PV'][0]["value"];
               value.values.U_bat = obj['U_bat'][0]["value"];
               value.values.I_PV = obj['I_PV'][0]["value"];
               value.values.I_bat = obj['I_bat'][0]["value"];
               value.values.rDC = obj['rDC'][0]["value"];
               value.values.rLet = obj['rLet'][0]["value"];
               //console.log('Succesfully received telemetry'.green);
               console.log(counter + ' ' + JSON.stringify(value));
               logger.write(counter + ' ' + JSON.stringify(value) + '\n');
               if(value.values.rLet == 0)
               {
                 client_attributes_ProdTest.prod_test = 'FAILED';
                 setClientAttrProdTest();
                 console.log('FAILED because rLet is not in right position'.red);
                 logger.write('FAILED because rLet is not in right position \n');
                 time_stop = moment();
                 logbook.write(time_stop.format('YYYY-MM-DD HH:mm:ss Z') + '\tSN\t'+ deviceName + '\tTEST FAILED\t'+'\n');
                 no_errors = false;
                 clearTimeout(timeout);
                 publishError(errorcode[16]);
                 //break;
                 //res.render('index', {message: null, error: 'Test FAILED for ' + serialNumber});
                 //res.end();
                 //process.exit(0);
               }
             }
             else {
               client_attributes_ProdTest.prod_test = 'FAILED';
               setClientAttrProdTest();
               console.log('FAILED receiving telemetry'.red);
               logger.write('FAILED receiving telemetry \n');
               time_stop = moment();
               logbook.write(time_stop.format('YYYY-MM-DD HH:mm:ss Z') + '\tSN\t'+ deviceName + '\tTEST FAILED\t'+'\n');
               no_errors = false;
               clearTimeout(timeout);
               publishError(errorcode[18]);
               //break;
               //res.render('index', {message: null, error: 'Test FAILED for ' + serialNumber});
               //res.end();
               //process.exit(0);
             }




           });




        }
      }


      var timeout = setTimeout(timeoutFunction(0), 5000);



  }

  function ChargeNowOn()
  {
    var options_setChargeState = {
          method: 'post',
          url: 'http://' + host + '/api/plugins/rpc/twoway/' + id,
          headers: {
            'Content-Type': 'application/json',
            //'Accept': 'application/json',
            'X-Authorization': 'Bearer ' + token
          },
          body: JSON.stringify(setChargeStateOn),
          timeout: 10000
    };
    request(options_setChargeState, function(error, response, body)
    {

       if(response && response.statusCode == 200)
       {
         obj = JSON.parse(body);
         console.log('Charging is now set to '+ body.blue);
         logger.write('Charging is now set to '+ body + '\n');
         publishMessage('Charging is now set to '+ body);
         WaitForCharge();
         console.log('Waiting for feedback'.magenta);
         logger.write('Waiting for feedback \n');
       }
       else {
         client_attributes_ProdTest.prod_test = 'FAILED';
         setClientAttrProdTest();
         console.log('ERROR setting ChargeState'.RED);
         logger.write('ERROR setting ChargeState \n');
         time_stop = moment();
         logbook.write(time_stop.format('YYYY-MM-DD HH:mm:ss Z') + '\tSN\t'+ deviceName + '\tTEST FAILED\t'+'\n');
         publishError(errorcode[18]);
         //res.render('index', {message: null, error: 'Test FAILED for ' + serialNumber});
         //res.end();
         //process.exit(0);
       }
     });
  }

  function DechargeNowOn()
  {
    var options_setDechargeState = {
          method: 'post',
          url: 'http://' + host + '/api/plugins/rpc/twoway/' + id,
          headers: {
            'Content-Type': 'application/json',
            //'Accept': 'application/json',
            'X-Authorization': 'Bearer ' + token
          },
          body: JSON.stringify(setDechargeStateOn),
          timeout: 10000
    };
    request(options_setDechargeState, function(error, response, body)
    {

       if(response && response.statusCode == 200)
       {
         obj = JSON.parse(body);
         console.log('Decharging is now set to '+ body.blue);
         logger.write('Decharging is now set to '+ body + '\n');
         WaitForDecharge();
         console.log('Waiting for feedback'.magenta);
         logger.write('Waiting for feedback \n');
       }
       else {
         client_attributes_ProdTest.prod_test = 'FAILED';
         setClientAttrProdTest();
         console.log('ERROR setting DechargeState'.red);
         logger.write('ERROR setting DechargeState \n');
         time_stop = moment();
         logbook.write(time_stop.format('YYYY-MM-DD HH:mm:ss Z') + '\tSN\t'+ deviceName + '\tTEST FAILED\t'+'\n');
         publishError(errorcode[19]);
         //res.render('index', {message: null, error: 'Test FAILED for ' + serialNumber});
         //res.end();
         //process.exit(0);
       }
     });
  }


  function ChargeNowOff()
  {
    var options_setChargeState = {
          method: 'post',
          url: 'http://' + host + '/api/plugins/rpc/twoway/' + id,
          headers: {
            'Content-Type': 'application/json',
            //'Accept': 'application/json',
            'X-Authorization': 'Bearer ' + token
          },
          body: JSON.stringify(setChargeStateOff),
          timeout: 10000
    };
    request(options_setChargeState, function(error, response, body)
    {

       if(response && response.statusCode == 200)
       {
         obj = JSON.parse(body);
         console.log('Charging is now set to '+ body.blue);
         logger.write('Charging is now set to '+ body + '\n');
       }
       else{
         client_attributes_ProdTest.prod_test = 'FAILED';
         setClientAttrProdTest();
         console.log('ERROR setting ChargeState to OFF'.red);
         logger.write('ERROR setting ChargeState to OFF \n');
         time_stop = moment();
         logbook.write(time_stop.format('YYYY-MM-DD HH:mm:ss Z') + '\tSN\t'+ deviceName + '\tTEST FAILED\t'+'\n');
         publishError(errorcode[20]);
         //res.render('index', {message: null, error: 'Test FAILED for ' + serialNumber});
         //res.end();
         //process.exit(0);
       }

     });
  }

  function DechargeNowOff()
  {
    var options_setDechargeState = {
          method: 'post',
          url: 'http://' + host + '/api/plugins/rpc/twoway/' + id,
          headers: {
            'Content-Type': 'application/json',
            //'Accept': 'application/json',
            'X-Authorization': 'Bearer ' + token
          },
          body: JSON.stringify(setDechargeStateOff),
          timeout: 10000
    };
    request(options_setDechargeState, function(error, response, body)
    {

       if(response && response.statusCode == 200)
       {
         obj = JSON.parse(body);
         console.log('Decharging is now set to '+ body.blue);
         logger.write('Decharging is now set to '+ body +'\n');
       }
       else{
         client_attributes_ProdTest.prod_test = 'FAILED';
         setClientAttrProdTest();
         console.log('ERROR setting DechargeState to OFF'.red);
         logger.write('ERROR setting DechargeState to OFF \n');
         time_stop = moment();
         logbook.write(time_stop.format('YYYY-MM-DD HH:mm:ss Z') + '\tSN\t'+ deviceName + '\tTEST FAILED\t'+'\n');
         publishError(errorcode[21]);
         //res.render('index', {message: null, error: 'Test FAILED for ' + serialNumber});
         //res.end();
         //process.exit(0);
       }
     });
  }

  function setSharedAttrOff()
  {
    var options_postSharedAtt = {
      method: 'post',
      url: 'http://' + host + '/api/plugins/telemetry/DEVICE/' + id + '/SHARED_SCOPE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(shared_attributes_off),
      timeout: 10000
      };
      request(options_postSharedAtt, function(error, response, body) {
        if(response && response.statusCode == 200)
        {
          console.log('Succes setting uploadFrequency to '.green + shared_attributes_off.uploadFrequency );
          logger.write('Succes setting uploadFrequency to ' + shared_attributes_off.uploadFrequency +'\n')
        }
        else
        {
          client_attributes_ProdTest.prod_test = 'FAILED';
          setClientAttrProdTest();
          console.log('error setting uploadFrequency'.red);
          logger.write('error setting uploadFrequency \n');
          time_stop = moment();
          logbook.write(time_stop.format('YYYY-MM-DD HH:mm:ss Z') + '\tSN\t'+ deviceName + '\tTEST FAILED\t'+'\n');
          publishError(errorcode[22]);
          //res.render('index', {message: null, error: 'Test FAILED for ' + serialNumber});
          //res.end();
          //process.exit(0);

        }
      });

  }

  function setClientAttrProdTest()
  {
    var options_postClientAtt = {
      method: 'post',
      url: 'http://' + host + '/api/v1/' + accesstoken + '/attributes',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(client_attributes_ProdTest),
      timeout: 10000
      };
      request(options_postClientAtt, function(error, response, body) {
        if(response && response.statusCode == 200)
        {
          console.log('Succes setting client attributes to '.green + client_attributes_ProdTest.prod_test);
          logger.write('Succes setting client attributes to ' + client_attributes_ProdTest.prod_test +'\n')
          if(client_attributes_ProdTest.prod_test != 'TESTING')
          {
            //process.exit(0);
          }

        }
        else
        {
          client_attributes_ProdTest.prod_test = 'FAILED';
          //setClientAttrProdTest();
          console.log('Error setting client attributes to '.red + client_attributes_ProdTest.prod_test);
          logger.write('Error setting client attributes to ' + client_attributes_ProdTest.prod_test +'\n');
          time_stop = moment();
          logbook.write(time_stop.format('YYYY-MM-DD HH:mm:ss Z') + '\tSN\t'+ deviceName + '\tTEST FAILED\t'+'\n');
          publishError(errorcode[23] + client_attributes_ProdTest.prod_test);
          if(client_attributes_ProdTest.prod_test != 'TESTING')
          {
            //process.exit(0);
          }
          //res.render('index', {message: null, error: 'Test FAILED for ' + serialNumber});
          //res.end();

        }
      });

  }

  function getClientAttr(client_attribute)
  {
    var options_getClientAtt = {
      method: 'get',
      url: 'http://' + host + '/api/v1/' + accesstoken + '/attributes?clientKeys=',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 10000
    };
    request(options_getClientAtt, function(error, response, body) {
        if(response && response.statusCode == 200)
        {
          obj = JSON.parse(body);
          console.log('Succes getting client attribute'.green +'\n');
          logger.write('Succes getting client attribute' +'\n\n')
          //console.log(body);
          firmware = obj.firmware;
          firmware_wifi = obj.firmware_wifi;
          console.log('Firmware: '.blue +firmware);
          logger.write('Firmware: '+firmware +'\n');
          console.log('Firmware WIFI: '.blue +firmware_wifi +'\n');
          logger.write('Firmware WIFI: '+firmware_wifi +'\n\n');
        }
        else
        {
          console.log('Error getting client attribute'.red);
          logger.write('Error getting client attribute' +'\n');
          publishError(errorcode[24]);
          //res.render('index', {message: null, error: 'Test FAILED for ' + serialNumber});
          //res.end();
        }
      });

  }

});


app.listen(3000, function () {
  console.log('Listening on port 3000!')
})

console.log('PRODUCTION TESTER ILUBAT '+ version + '\n');
