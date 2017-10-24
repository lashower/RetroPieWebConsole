var app = angular.module('myApp', ['ui.router','ngFileUpload','ngMaterial'])
app.controller('MainController', function($scope, $stateProvider) {
         $scope.$stateProvider = $stateProvider;
         $scope.mainName = "RetroPie Web Console";
})

