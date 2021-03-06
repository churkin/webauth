var ntlm = require('./lib/ntlm');

var authMethods = ['NTLM', 'Basic'];

function getAuthMethName (res) {
	var authHeader          = res.headers['www-authenticate'] || '';
	var proposedAuthMethods = authHeader.toLowerCase().split(',');

	for (var i = 0; i < authMethods.length; i++) {
		for (var j = 0; j < proposedAuthMethods.length; j++) {
			if (proposedAuthMethods[j].indexOf(authMethods[i].toLowerCase()) !== -1)
				return authMethods[i];
		}
	}

	return '';
}

function addBasicReqInfo (credentials, reqOptions) {
	var authReqStr    = credentials.username + ':' + credentials.password;
	var authReqHeader = 'Basic ' + new Buffer(authReqStr).toString('base64');

	reqOptions.headers['Authorization'] = authReqHeader;
}

function addNTLMNegotiateMessageReqInfo (credentials, reqOptions, protocolInterface) {
	var agent = new protocolInterface.Agent();

	agent.maxSockets = 1;
	reqOptions.agent = agent;

	reqOptions.headers['connection']    = 'keep-alive';
	reqOptions.headers['Authorization'] = ntlm.createType1Message({
		domain:      credentials.domain || '',
		workstation: credentials.workstation || ''
	});
}

function addNTLMAuthenticateReqInfo (credentials, reqOptions, res) {
	var type2msg = ntlm.parseType2Message(res.headers['www-authenticate']),
		type3msg = ntlm.createType3Message(type2msg, {
			username:    credentials.username,
			password:    credentials.password,
			domain:      credentials.domain || '',
			workstation: credentials.workstation || ''
		});

	reqOptions.headers['Authorization'] = type3msg;
	reqOptions.headers['connection']    = 'close';
}

exports.addCredentials = function (credentials, reqOptions, res, protocolInterface) {
	var authInfo = exports.getAuthInfo(res);

	if (authInfo.method === 'Basic')
		addBasicReqInfo(credentials, reqOptions);
	else if (authInfo.method === 'NTLM') {
		if (!authInfo.isChallengeMessage)
			addNTLMNegotiateMessageReqInfo(credentials, reqOptions, protocolInterface);
		else
			addNTLMAuthenticateReqInfo(credentials, reqOptions, res);
	}
};

exports.requiresResBody = function (res) {
    var authInfo = exports.getAuthInfo(res);

    return !authInfo.isChallengeMessage && authInfo.method.toLowerCase() === 'ntlm';
};

exports.getAuthInfo = function (res) {
	var method = getAuthMethName(res);

	return {
		method:             method,
		isChallengeMessage: method === 'NTLM' ? ntlm.isChallengeMessage(res) : false,
		canAuthorize:       !!method
	}
};
