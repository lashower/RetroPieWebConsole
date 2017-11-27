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

    var sUpdateState = {
        name : 'scriptUpdate',
        url : '/scriptUpdate',
        controller : 'ScriptUpdateController',
        templateUrl : 'scriptUpdate'
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

    var gamesState = {
        name: 'games',
        url : '/games',
        controller: 'GameController',
        templateUrl : 'games'
    }

	$stateProvider.state(overviewState);
	$stateProvider.state(manageState);
    $stateProvider.state(gamesState);
	$stateProvider.state(sUpdateState);
    $stateProvider.state(historyState);
    $stateProvider.state(monitorState);
	$urlRouterProvider.otherwise('/overview')
});
