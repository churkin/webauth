/*
    Authentication methods priority:
        - NTLM
        - BASIC

    The 'credentials' obj struct:
        {
            username : 'Churkin.Andrey',  // required field
            password : 'myPass$1',        // required field
            domain : 'CORP',              // uses in the ntlm auth
            workstation: 'CHURKIN-LINUX', // uses in the ntlm auth
        }
 */

var basic = require('./lib/basic'),
	http = require('http'),
	https = require('https'),
    ntlm = require('./lib/ntlm');
	
// Consts
var AUTH_BASIC = exports.AUTH_BASIC = 'Basic',
    AUTH_NTLM = exports.AUTH_NTLM = 'NTLM';

var authMethods = {};

authMethods[AUTH_NTLM] = ntlm.auth;
authMethods[AUTH_BASIC] = basic.auth;

function getAuthMethName(res) {
    var authHeader = res.headers['www-authenticate'] || '',
        proposedAuthMethods = authHeader.split(',');

    for(var methName in authMethods) {
        for(var i = 0; i < proposedAuthMethods.length; i++) {
            if(proposedAuthMethods[i].indexOf(methName) !== -1)
                return methName;
        }
    }

    return '';
}

var auth = exports.auth = function(reqOptions, credentials, callback, isHttps, res, method) {
	var protocolInterface = isHttps ? https : http;

	if(res) {
        method = method || getAuthMethName(res);

		if(method && res.statusCode === 401)
            authMethods[method](credentials, callback, reqOptions, protocolInterface);
        else
            callback(res);
	} else {	
		protocolInterface.request(reqOptions, function(response) {
            auth(reqOptions, credentials, callback, isHttps, response, method);
		}).end();
	}
};

