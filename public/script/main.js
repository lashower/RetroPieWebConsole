var app = angular.module('myApp', ['ui.router','ngFileUpload','ngMaterial','chart.js'])
app.controller('MainController', function($scope, $stateProvider) {
         $scope.$stateProvider = $stateProvider;
         $scope.mainName = "RetroPie Web Console";
})

