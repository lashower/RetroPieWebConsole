app.controller('StreamingController', function($scope, $http, $rootScope, $interval) {

    $scope.refreshInterval = 500;
    $scope.videoHeight = -1;
    $scope.videoWidth = -1;
    $scope.videoCompr = 1;
    $scope.screenURL = "/getScreenshot?height=400";

    $scope.getScreen = function() {
        var screenURL = '/getScreenshot?r=' + Date.now();
        screenURL += ($scope.videoHeight > 0) ? "&height=" + $scope.videoHeight : "";
        screenURL += ($scope.videoWidth > 0) ? "&width=" + $scope.videoWidth : "";
        $scope.screenURL = screenURL;
    }

    var reloadScreen = $interval($scope.getScreen,500);

    $scope.updateInterval = function() {
        $interval.cancel(reloadScreen);
        if($scope.refreshInterval > 0)
        {
            reloadScreen = $interval($scope.getScreen,$scope.refreshInterval);
        }
    }

    $scope.$on("$destroy",function(){
        if(angular.isDefined(reloadScreen)) {
            $interval.cancel(reloadScreen);
        }
    });

});
