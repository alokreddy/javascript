// calling api functions
getOpenJobCount();
getHeadCountDetail();
ResumeToReviewCount();
SpendAmountByDate();


var callOnce = false;

/*
 * function to get open jon count
 */
function getOpenJobCount() {
	var requestParams = [];
	requestParams = {
			"url": dashboardServiceUrl + '/dashboard/widget/openjobcount',
			"requestType": "GET",
			"params": {},
			"headers": {
				"Accept": "application/json"
			},
			"oldRequest": "getOpenJobCount"
	}
	
	var res = makeRequest(requestParams);
	res
	.done(function(res) {
		$("#dash-headcount").find("span").text(res.data.openjobcount);
	})
	.fail(function(err) {
		console.log(err);
	});
}

/*
 * function to get head count detail
 */
function getHeadCountDetail() {
	var requestParams = [];
	requestParams = {
			"url": dashboardServiceUrl + '/dashboard/widget/headcountdetail',
			"requestType": "GET",
			"params": {},
			"headers": {
				"Accept": "application/json"
			},
			"oldRequest": "getHeadCountDetail"
	}
	
	var res = makeRequest(requestParams);
	res
	.done(function(res) {
		console.log(res);
	})
	.fail(function(err) {
		console.log(err);
	});
}

/*
 * function to get resume to review count
 */
function ResumeToReviewCount() {
	var requestParams = [];
	requestParams = {
			"url": dashboardServiceUrl + '/dashboard/widget/resumetoreviewcount',
			"requestType": "GET",
			"params": {},
			"headers": {
				"Accept": "application/json"
			},
			"oldRequest": "ResumeToReviewCount"
	}
	
	var res = makeRequest(requestParams);
	res
	.done(function(res) {
		if(typeof res.data != "undefined") {
			$("#dash-hours").find("span").text(res.data.resumetoreviewcount);
		}
	})
	.fail(function(err) {
		console.log(err);
	});
}

/*
 * function to get spend amount by date
 * @params - start date and end date
 */
function SpendAmountByDate() {

	var requestParams = [];
	requestParams = {
			"url": dashboardServiceUrl + '/dashboard/widget/spendamountbydate',
			"requestType": "POST",
			"params": {
				'startDate': '2018-10-10',
				'endDate': '2018-10-20',
			},
			"headers": {
				"Accept": "application/json"
			},
			"oldRequest": "SpendAmountByDate"
	}
	
	var res = makeRequest(requestParams);
	res
	.done(function(res) {
		console.log(res);
	})
	.fail(function(err) {
		console.log(err);
	});
}


/*
 * function to concat 2 json strings
 */
function jsonConcat(o1, o2) {
 for (var key in o2) {
  o1[key] = o2[key];
 }
 return o1;
}


/*
 * function to make API call using AJAX, Deffered and Promise 
 */
function makeRequest(requestParams) {
	var headers = {
			'Authorization': 'Bearer ' + authToken
	};
	// concating extra headers
	headers = jsonConcat(headers, requestParams.headers);
	
	// checking return content type
	var dataType = "json";
	if(headers.Accept == "application/xml") {
		dataType = "xml";
	}
	
	var deferred = $.Deferred();
	
	var response = $.ajax({
	    url: requestParams.url,
	    type: requestParams.requestType,
	    dataType: dataType,
	    data: requestParams.params, 
	    headers: headers,
	    success: function(res) {
	    	if(res.error != null) {
	    		deferred.reject(res.error);
	    		if(res.error=="Invalid Token") {
	    			//window.location.href = "";
	    		}
	    	} else {
	    		deferred.resolve(res);
	    	}
	    },
	    error: function(err) {
	    	deferred.reject(err);
	    }
	});
	
	return deferred.promise();
}

// Note: we can't use this function
/*
 * function to get new token
 */
function refreshToken(oldRequest) {
	if(callOnce == false) {
		callOnce = true;
		var requestParams = [];
		requestParams = {
				"url": tokenURL,
				"requestType": "GET",
				"params": {},
				"headers": {
				}
		}
		
		var res = makeRequest(requestParams);
		res
		.done(function(res) {
			if(typeof res.token != "undefined" && res.token != null) {
				authToken = res.token;
				eval(oldRequest+"()");
			}
		})
		.fail(function(err) {
			console.log(err);
		});
	} else {
		eval(oldRequest+"()");
	}
}