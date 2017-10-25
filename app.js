const express = require('express');
const app = express();
const RetroPieHelper = require('./lib/RetroPieHelper');
const RomUtil = require('./lib/RomUtil');
const cron = require('node-cron');
const logger = require('winston');
const timeout = require('connect-timeout');

app.use(timeout(1800000));

RetroPieHelper.init().then(RetroPieHelper.updateCache)

setInterval(RetroPieHelper.updateCache,300000);

cron.schedule('5 * * * *', function(){
      console.log('running a task every minute');
      RetroPieHelper.updateCache();
});

app.set('view engine', 'ejs');

app.use(express.static(__dirname + '/public'));

app.use(express.static(__dirname + '/node_modules'));

app.get('/', function(req, res) {
    res.render('pages/index');
});

app.get('/overview', function(req, res) {
    console.log("Loading overview");
    res.render('pages/overview');
});

app.get('/manage', function(req, res) {
    console.log("Loading manage");
    res.render('pages/manage');
});

app.get('/basic', function(req,res) {
    res.render('pages/basic');
});

app.get('/', function(req,res) {
    console.log("Test");
});

app.get('/detail.tmpl.html',function(req,res) {
    res.render('partials/detailtmpl');
});

app.get('/scriptUpdate',function(req,res) {
    console.log("Getting Script Update");
    res.render('pages/scriptUpdate');
});

app.get('/reboot',function(req,res) {
    console.log("Getting Script Update");
    res.render('pages/reboot');
});

app.get('/apps', function (req, res) {
    console.log("Getting Apps");
    RetroPieHelper.getApps(req.query).then(result => {
        logger.silly('Result',result);
        res.json(result);
    }).catch(err => {
        logger.error('Error',err);
    });
});

app.post('/execute', function(req, res) {
    res.connection.setTimeout(0);
    logger.debug("Using execute");
    RetroPieHelper.execute(req.query).then((result) =>
    {
        //logger.debug('app.execute','success',result);
        res.json(result);
    }).catch(result => {
        logger.warning('app.execute','failure',result);
        res.json(result);
    });
});

app.get('/getUserDetails', function(req,res) {
    console.log('Getting user details');
    RomUtil.getUserDetails().then(result => {
        result.rpsVersion = process.env.RPSVERSION;
        result.retroArchHome = process.env.RAHOME;
        res.json(result);
    }).catch(result => {
        res.json(result);
    });
});

//app.get('/getRomFolders', function(req,res) {
//    RetroPieHelper.
//});

//app.get('/filemanage', function(req,res) {

//});

//app.post('/fileupload', function(req, res) {

//});

app.post('/updateScripts',function(req, res) {
    console.log("Updating scripts");
    RetroPieHelper.updateScripts().then(result => {
        console.log('success');
        res.json(result)
    }).catch(err => {
	console.log('failure',err);
        res.json(err)}
    );
});

app.get('/que',function(req,res) {
    RetroPieHelper.getQue().then(result => {
        res.json(result);
    }).catch(err => {
        res.json(err);
    });
});

app.post('/performReboot',function(req, res) {
    console.log("Rebooting system");
    RetroPieHelper.performReboot(req.query).then(result => {res.json(result)}).catch(err => {res.json(err)});
});

app.listen(3000);
logger.debug('3000 is the magic port');
