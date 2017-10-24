app.config(function($stateProvider, $urlRouterProvider) {
	var overviewState = {
		name : 'overview',
		url : '/overview',
        controller : 'OverviewController',
        templateUrl : 'overview'
	}

    var manageState = {
        name : 'manage',
        url : '/manage',
        controller : 'ManageController',
        templateUrl : 'manage'
    }

    var basicState = {
        name : 'basic',
        url : '/basic',
        controller : 'BasicController',
        templateUrl : 'basic'
    }

    var sUpdateState = {
        name : 'scriptUpdate',
        url : '/scriptUpdate',
        controller : 'ScriptUpdateController',
        templateUrl : 'scriptUpdate'
    }

    var rebootState = {
        name : 'reboot',
        url : '/reboot',
        controller : 'RebootController',
        templateUrl : 'reboot'
    }
    
	$stateProvider.state(overviewState);
	$stateProvider.state(manageState);
	$stateProvider.state(basicState);
	$stateProvider.state(sUpdateState);
	$stateProvider.state(rebootState);
	$urlRouterProvider.otherwise('/overview')
});
