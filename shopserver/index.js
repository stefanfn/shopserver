#!/usr/bin/node

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const
    fs = require('fs'),
    http = require('http'),
    nodemailer = require('nodemailer'),

    tableName = 'list',
    port = process.env.SHOP_PORT || 54783, // L I S T E
    transport = nodemailer.createTransport({
        host: 'mail.gmx.net',
        port: 465,
        auth: {
            user: 'stefan.sassenberg@gmx.de',
            pass: 'Wbfynu!.TjNm4KZ',
        }
    }),
    from = 'coolmule.de <stefan.sassenberg@gmx.de>',
    to = 'stefan.sassenberg@gmx.de',
    subject = 'Ir de compras';

var database;

let prepareDatabasePromise;

function dbErrorHandler(resolve, reject, err) {
    if (err === null) {
        resolve();
    } else {
        console.log('prepareDatabase', err);
        reject(err.code);
    }
}

function dumpDatabase() {
    database.each(
        'SELECT * FROM ' + tableName,
        (err, row) => {
            console.log(err || row);
        }
    );
}

function onPostData(postEvent, data = '') {
    //console.log('onPostData', data && data.length);
    //fs.appendFile('onPostData.txt', postEvent.postData, function() {});
    postEvent.postData = (postEvent.postData || '') + data;
}

function onPostEnd(postEvent) {
    //console.log('onPostEnd');
    try {
        JSON.parse(postEvent.postData);
    } catch (err) {
        //fs.writeFile('onPostEnd.txt', postEvent.postData, function() {});
        respond(postEvent.response, {httpCode: 501, content: 'parse error'});
    }

    const
        respondOk = (content) => {
            console.log('respondOk');
            respond(
                postEvent.response,
                {
                    httpCode: 200,
                    contentType: 'application/json',
                    content: content || '{}'
                }
            );
        },
        respondFailure = () => {
            console.log('respondFailure');
            respond(postEvent.response, {httpCode: 501});
        };

    switch (postEvent.service) {
        case '':
            persistList(postEvent.postData)
                .then(
                    respondOk.bind(this, postEvent.postData),
                    respondFailure
                );
            break;
        case 'email':
            sendEmail(JSON.parse(postEvent.postData).list)
                .then(respondOk, respondFailure);
            break;
        default:
            console.log('Unknown service', postEvent.service);
            exit;
    }
}

function persistList(list) {
    console.log('persistList:', list && list.length);
    return prepareDatabase().then(updatePendingList.bind(this, list))
}

function prepareDatabase() {
    console.log('prepareDatabase');
    if (prepareDatabasePromise) {
        return prepareDatabasePromise;
    }

    return database.exec(
        'CREATE TABLE IF NOT EXISTS ' + tableName +
        ' (' +
	    'list_id integer PRIMARY KEY, ' +
	    'items text, ' +
	    'pending boolean NOT NULL' +
        ')'
    );
}

function queryPendingList() {
    console.log('queryPendingList');
    return database
        .get('SELECT items FROM ' + tableName + ' WHERE pending');
}

function resetList() {
    console.log('resetList');
    return database
	.exec('UPDATE list SET pending = 0 WHERE pending');
}

function respond(response, config = {}) {
    //console.log('respond');
    let httpCode = config.httpCode || 200;
    let headers = {
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Origin': 'http://shop.coolmule.de',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS'
    };
    if (httpCode === 200 && config.content) {
        headers['Content-Type'] = config.contentType || 'text/html';
    }

    if (httpCode > 0) {
        //console.log('respond: headers:', headers);
        response.writeHead(httpCode, headers);
    }

    if (config.content) {
        //console.log('respond:', config.content);
        response.write(config.content);
    }

    if (config.endResponse === undefined || config.endResponse === true) {
        response.end();
    }
}

function sendAnswer(response) {
    console.log('sendAnswer');
    prepareDatabase()
        .then(queryPendingList)
        .then((list) => {
            console.log('before respond');
            respond(response, {httpCode: 200, contentType: 'application/json', content: list});
        })
        .catch((err) => {
            console.log('sendAnswer', err);
            respond(response, {httpCode: 501});
        });
}

function sendEmail(text) {
    console.log('sendEmail');
    return new Promise((resolve, reject) => {
        transport.sendMail({from, to, subject, text})
        .then(() => {
            resolve();
        })
        .catch((info) => {
            console.log('sendEmail catch', info);
            reject(info);
        });
    });
}

function updatePendingList(items) {
    return database.run(
        'INSERT OR REPLACE INTO list (list_id, items, pending)' +
            'VALUES ((SELECT list_id FROM list WHERE pending), ?, 1)',
        items
    );
}

function processRequest(request, response) {
    let params, postData;
    if('GET' === request.method && 'http://shop.coolmule.de/' !== request.headers.referer) {
        console.log('wrong referer', request.headers.referer);
        return;
    }
    console.log('request.method', request.method);
    switch (request.method) {
        case 'GET':
            sendAnswer(response);
            break;
        case 'POST':
            let postEvent = {response, service: request.url.slice(1)};
            fs.appendFile('onPostData.txt', '', function() {});
            request.on('data', onPostData.bind(this, postEvent));
            request.on('end', onPostEnd.bind(this, postEvent));
            break;
        case 'PUT':
            resetList();
            respond(response, {});
            break;
        case 'OPTIONS':
            respond(response, {});
            break;
        default:
            respond(response, {httpCode: 501});
    }
}

open({
  filename: '../resources/shop',
  driver: sqlite3.Database
}).then((db) => {
  database = db;

console.log('database', database);
console.log('port', port);

  http.createServer(processRequest).listen(port);
})

