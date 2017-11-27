app.controller('ManageController',function($scope, $http, $rootScope, $interval, $mdDialog) {
        
        $scope.appTypes = [];
        $scope.filter = {type:'name',reverse:false,name:'',installed:'all',selected:'all'};
        $scope.showFunctions = false;
        $scope.searchedList = [];
        $scope.mainFunctions = [];
        $scope.filteredItems;
        $scope.executions = [];
        $scope.priority = 1;
        $scope.builds = [];

        /**************************************************************
         *                                                            *
         *                 Methods for user interface                 *
         *                                                            *
         *************************************************************/

        /**
         *
         * Toggles the panels to be displayed or not.
         * @param id The id of the panel.
         * @param show For internal JS use, you can force 
         *             it to hide or show.
         *
         */
        $scope.togglePanel = function(id,show=null) {
            var pan = document.getElementById(id);
            if(show == null)
            {
                if(pan.classList.contains('in'))
                {
                    pan.classList.remove('in');
                } else
                {
                    pan.classList.add('in');
                }
            } else
            {
                if(pan.classList.contains('in') && !show)
                {
                     pan.classList.remove('in');
                } else if(!pan.classList.contains('in') && show)
                {
                    pan.classList.add('in');
                }
            }
        }

        /**
         *
         * Simple method to merge an array of arrays into one array.
         * @param arr The array to flatten. EX: [['test1,'test2'],['test3','test4']]
         * @return An array not containing any arrays. EX:['test1','test2','test3','test4']
         *
         */
        $scope.flatten = function(arr) {
          return arr.reduce(function (flat, toFlatten) {
            return flat.concat(Array.isArray(toFlatten) ? $scope.flatten(toFlatten) : toFlatten);
          }, []);
        }

        /**
         * * Displays details for an application.
         * * @param ev The event object used for openning and closing.
         * * @param curritem The application object containing details
         * *                 like name, description, and type.
         * */
        $scope.openApp = function(ev,app) {
            console.log(app);
            $mdDialog.show({
                locals: {app:app},
                controller: AppController,
                templateUrl: '/app.tmpl.html',
                    parent: angular.element(document.body),
                    targetEvent: ev,
                        clickOutsideToClose:true,
                        fullscreen: true
            })
            .then(function(action) {
                console.log(action);
            }, function() {
                $scope.status = 'You cancelled the dialog.';
            });
        }


        /**
         * Displays details for an execution.
         * @param ev The event object used for openning and closing.
         * @param curritem The exection object containing details 
         *                 like command name, type, and execution status.
         */
        $scope.showDetails = function(ev,curritem) {
            console.log(curritem);
            $mdDialog.show({
                locals: {item:curritem},
                controller: DialogController,
                templateUrl: '/detail.tmpl.html',
                parent: angular.element(document.body),
                targetEvent: ev,
                clickOutsideToClose:true,
                fullscreen: true
            })
            .then(function(answer) {
                $scope.status = 'You said the information was "' + answer + '".';
            }, function() {
                $scope.status = 'You cancelled the dialog.';
            });
        }

        /**
         *  Opens details for a build/bundle.
         *  @param ev The event object used for openning and closing.
         *  @param build The build object containing things like the name,
         *               description, emulators, and roms.
         */
        $scope.openBuild = function(ev,build) {
            console.log(build);
            $mdDialog.show({
                locals: {build:build},
                controller: BuildController,
                templateUrl: '/build.tmpl.html',
                parent: angular.element(document.body),
                targetEvent: ev,
                clickOutsideToClose:true,
                fullscreen: true
            })
            .then(function(action) {
                $scope.togglePanel('results',true);
                if(action == "execute") {
                    build.commands.forEach(comm => {
                        $scope.runCommand(comm,build.emulators);
                    });
                }
            }, function() {
            });
        }


        /**
         *
         *  After loading all the apps, this fills in all the arrays used in various sections.
         *
         */
        $scope.setArrays = function() {
            //Clone the app list
            $scope.searchedList = $rootScope.appList.map((app) => { app.selected = false; return app });
            //Load the different application types
            $scope.appTypes = $rootScope.appList.map((app) => { return app.type }).filter((cat, idx, arr) => { return cat != "" && arr.indexOf(cat) === idx; }).sort();
            $scope.appTypes.unshift('all');
            $scope.filter['all'] = true;
            //Get a list of available functions.
            var functions = $scope.flatten($scope.searchedList.map((app) =>{ return app.functions }));
            var counts = {};
            functions.forEach((x) => { counts[x] = (counts[x] || 0)+1; });
            functions = functions.filter((cat, idx, arr) => { return cat != "" && arr.indexOf(cat) === idx; }).sort();
            $scope.mainFunctions = functions.filter((cat, idx, arr) => { return cat != "" && counts[cat] > 20 && arr.indexOf(cat) === idx; }).sort();
        }
        
        /**
         *
         * Methed to un/select all items that have been searched for.
         *
         **/
        $scope.setSelected = function(obj) {
            $scope.filteredItems.forEach(function (app) {
                 app.selected = obj.target.checked;
            });
        }
        
        /**
         *
         * Method to send commands to NodeJS app for execution.
         * Technically, it only adds it to the queue and does not execute immediately.
         * @param comm The command to execute. EX: fullInstall, install_bin, build, configure 
         * @param apps The list of apps to execute full. Added to support bundles.
         *
         **/
        $scope.runCommand = function(comm,apps=null) {
            if(apps == null)
            {
                apps=$scope.searchedList.filter(function (app) { return app.selected });
            } else
            {
                apps.forEach(app => { app.selected = true });
            }
            apps.forEach(function (app) {
                if(app.selected)
                {
                    $http({
                        transformRequest: angular.identity,
                        method: 'POST',
                        url: '/execute',
                        timeout: 1800000,
                        params: {
                            command: comm,
                            app: JSON.stringify(app),
                            priority: $scope.priority
                        }
                    }).then(function(response) {
                        //TODO auto add item after getting a response.
                        console.log(response.data);
                    });
                }
            });
        }

        /**
         * Loads all the applications available for RetroPie into scope.
         **/
        $scope.loadApps = function() {
            $http({
                transformRequest: angular.identity,
                method: 'GET',
                url: '/apps'
            }).then(function(response) {
                $rootScope.appList = response.data;
                $scope.setArrays();
                $scope.loadBuilds();
            });
        };

        /**
         * Loads all available build/bundles for execution.
         **/
        $scope.loadBuilds = function() {
            $http({
                transformRequest: angular.identity,
                method: 'GET',
                url: '/retrobuilds'
             }).then(function(response) {
                $scope.builds = response.data;
                $scope.builds.forEach((build) => {
                    var emulators = [];
                    build.emulators.forEach((emu) => {
                        if(emu.type == "group")
                        {
                            emulators = emulators.concat($rootScope.appList.filter(app => { return app.type == emu.name }));
                        } else
                        {
                            emulators.push(emu);
                        }
                    });
                    build.emulators = emulators.sort(function(a,b) {return (a.type > b.type) ? 1 : ((b.type > a.type) ? -1 : 0);} );;
                });
            });
        };

        /**
         * Checks an app to see if it meets the filter criteria.
         * @param app The app to validate.
         * @return Either the app if the app meets the criteria or null.
         **/
        $scope.applyFilter = function(app) {
            var result = app;
            if($scope.filter.installed != 'all')
            {
                if($scope.filter.installed == "are" && app.installed == false)
                {
                    return null;   
                } else if($scope.filter.installed == "not" && app.installed == true)
                {
                    return null;
                }
            }
            if($scope.filter.selected != 'all')
            {
                if($scope.filter.selected == "are" && app.selected == false)
                {
                    return null;
                } else if($scope.filter.selected == "not" && app.selected == true)
                {
                    return null;
                }
            }
            var valid = $scope.filter['all'];
            for(var i = 0; !valid && i < $scope.appTypes.length; i++)
            {
                if(!valid && $scope.filter[$scope.appTypes[i]])
                {
                    valid = (app.type == $scope.appTypes[i]); 
                }
            }
            if(valid)
            {
                return app;
            } else
            {
                return null;
            }
        }

        /**
         *  Method to update the execution results.
         *  Pulled from the database used in the NodeJS app.
         **/
        $scope.updateQue = function()
        {
            $http({
                transformRequest: angular.identity,
                method: 'GET',
                url: '/que',
                timeout: 1800000
            }).then(function(response) {
                var items = response.data.items.map((item) => {
                    item.end_date = (item.end_date == null) ? null : new Date(item.end_date);
                    item.added_date = (item.added_date == null) ? null : new Date(item.added_date);
                    item.start_date = (item.start_date == null) ? null : new Date(item.start_date);
                    return item;
                });
                $scope.executions = [];
                items.forEach(function (exec) {
                    var cat=$scope.executions.filter(function(categ) { return categ.name == exec.command});
                    if(cat.length > 0)
                    {
                        cat = cat[0];
                        //Iteration 2 needs to fix these.
                        cat.totalCount++;
                        if(exec.end_date != null)
                        {
                            cat.completed++;
                        }
                        cat.items.push(exec);
                    } else
                    {
                        cat = {name:exec.command};
                        cat.totalCount = 1;
                        cat.completed = exec.end_date != null ? 1 : 0;
                        cat.items = [];
                        cat.items.push(exec);
                        $scope.executions.push(cat);
                    }
                });
            });
        }

        /**
         * * Controller used to view Application details.
         * * @param build The build containing the name, description, and functions.
         * *
         * **/
        function AppController($scope, $mdDialog, app) {
            $scope.app = app;
            if($scope.app.help != null)
            {
                $scope.app.help = $scope.app.help.replace(/\\n/g,'\n')
            }
            $scope.hide = function() {
                $mdDialog.hide();
            };

            $scope.cancel = function() {
                $mdDialog.cancel();
            };

            $scope.action = function(action) {
                console.log(action);
                $mdDialog.hide(action);
            };
        }


        /**
         * Controller used to view the build/bundle details.
         * @param build The build containing the name, description, and emulators.
         * 
         **/
        function BuildController($scope, $mdDialog, build) {
            $scope.build = build;
            $scope.hide = function() {
                $mdDialog.hide();
            };

            $scope.cancel = function() {
                $mdDialog.cancel();
            };

            $scope.action = function(action) {
                $mdDialog.hide(action);
            };
        }

        /**
         *  Used to view execution details.
         *  @param item The execution item containing the results and more.
         *
         **/
        function DialogController($scope, $mdDialog, item) {
            $scope.item = item;

            $scope.hide = function() {
                $mdDialog.hide();
            };

            $scope.cancel = function() {
               $mdDialog.cancel();
            };
            
            $scope.action = function(action) {
                if(action != 'cancel')
                {
                    $http({
                        transformRequest: angular.identity,
                        method: 'POST',
                        url: '/updateExec',
                            params: {
                                details: action,
                                exec:item
                            }
                    }).then(function(response) {
                        response.data.end_date = (response.data.end_date == null) ? null : new Date(response.data.end_date);
                        response.data.added_date = (response.data.added_date == null) ? null : new Date(response.data.added_date);
                        response.data.start_date = (response.data.start_date == null) ? null : new Date(response.data.start_date);
                        $scope.item = response.data;
                        $mdDialog.hide();
                    });

                }
            };

        }

        $scope.loadApps();
        $scope.updateQue();
        var reloadQue = $interval($scope.updateQue,10000);

        $scope.$on("$destroy",function(){
            if(angular.isDefined(reloadQue)) {
                $interval.cancel(reloadQue);
            }
        });

});
