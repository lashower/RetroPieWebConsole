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

    var historyState = {
        name: 'history',
        url : '/history',
        controller:'HistoryController',
        templateUrl : 'history'
    }
    
    var monitorState = {
        name: 'monitor',
        url : '/monitor',
        controller:'MonitorController',
        templateUrl : 'monitor'
    }

	$stateProvider.state(overviewState);
	$stateProvider.state(manageState);
	$stateProvider.state(basicState);
	$stateProvider.state(sUpdateState);
	$stateProvider.state(rebootState);
    $stateProvider.state(historyState);
    $stateProvider.state(monitorState);
	$urlRouterProvider.otherwise('/overview')
});
