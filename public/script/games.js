app.controller('GameController',function($scope, $http, $rootScope, $interval, $mdDialog,Upload) {
        
        $scope.gameTypes = [];
        $scope.filter = {type:'name',reverse:false,name:'',selected:'all',emulators:[],minPlayCount:0};
        $scope.options = {cheats:true,reset:true};
        $scope.upload = {emulator:"",type:""}
        $scope.builds = [];
        $scope.games = [];
        $scope.emulators = [];


        $scope.submit = function() {
            if ($scope.form.file.$valid && $scope.file) {
                $scope.upload($scope.file);
            }
        };

        $scope.uploadFiles = function (files) {
            var emulator = JSON.stringify($scope.upload.emulator);
            var type = $scope.upload.type;
            console.log($scope.upload.emulator);
            console.log($scope.upload.type);
            if (files && files.length) {
                for (var i = 0; i < files.length; i++) {
                    Upload.upload({
                        url:'upload/game',
                        data: {
                            file: files[i],
                            emulator: emulator,
                            type: type
                        }
                    }).then((resp) => { console.log('Success ' + resp.config.data.file.name + 'uploaded. Response: ' + resp.data);},
                        (err) => {console.log('Error status: ' + resp.status);},
                        (evt) => { var progressPercentage = parseInt(100.0 * evt.loaded / evt.total);console.log('progress: ' + progressPercentage + '% ' + evt.config.data.file.name);}
                    );
                }
            }
        }

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

        $scope.applyFilter = function(game) {
            var valid = (game.playcount >= $scope.filter.minPlayCount); 
            if(valid)
            {
                try {
                    valid = $scope.filter.emulators.find(emu => { return game.emulator == emu.name }).selected;
                }catch(ex)
                {
                    console.log("failure",game.emulator);
                }
            }
            return valid;
        }


        /**
         * Displays details for a game.
         * @param ev The event object used for openning and closing.
         * @param game The game object containing details
         *                 like name, saves, states, and cheats.
         **/
        $scope.openGame = function(ev,game) {
            console.log(game);
            game.emuObj = $scope.emulators.find(emu => { return emu.name == game.emulator });
            $mdDialog.show({
                locals: {game:game},
                controller: GameController,
                templateUrl: '/game.tmpl.html',
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
         *  Opens details for a build/bundle.
         *  @param ev The event object used for openning and closing.
         *  @param build The build object containing things like the name,
         *               description, emulators, and roms.
         **/
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
         * Methed to un/select all items that have been searched for.
         *
         **/
        $scope.setSelected = function(obj) {
            $scope.filteredItems.forEach(function (app) {
                 app.selected = obj.target.checked;
            });
        }


        
        /**
         * Loads all the applications available for RetroPie into scope.
         **/
        $scope.loadEmulators = function() {
            $http({
                transformRequest: angular.identity,
                method: 'GET',
                url: '/getEmulators'
            }).then(function(response) {
                $scope.emulators = response.data.map(emu => {
                    emu.selected = false;
                    return emu;
                }).sort(function(a,b) {return (a.fullname > b.fullname) ? 1 : ((b.fullname > a.fullname) ? -1 : 0);} );
            });
        };

        $scope.searchGames = function() {
            if($scope.options.reset)
            {
                $scope.games = [];
                $scope.filter.emulators = [];
            }
            var params = {};
            params.emulators = $scope.emulators.filter(emu => { return emu.selected == true });
            $http({
                transformRequest: angular.identity,
                method: 'GET',
                url: '/getRoms',
                params: {
                    emulators: JSON.stringify(params.emulators)
                }
            }).then(function(response) {
                if($scope.options.reset)
                {
                    response.data.forEach((emu) => {
                        if(emu.length > 0)
                        {
                            console.log(emu[0].emulator);
                            var emuFilter = {name:emu[0].emulator,selected:true};
                            $scope.filter.emulators.push(emuFilter);
                        }
                        emu.forEach(game => {
                            game.releasedate = game.releasedate ? new Date(Date.parse(game.releasedate)) : null;
                            game.lastplayed = game.lastplayed ? new Date(Date.parse(game.lastplayed)) : null;
                            $scope.games.push(game) 
                        });
                    });
                } else
                {
                    response.data.forEach((emu) => {
                        if(emu.length > 0)
                        {
                            var emuFilter = $scope.filter.emulators.find(e => {return e.name == emu[0].emulator});
                            if(emuFilter == null)
                            {
                                var emuFilter = {name:emu[0].emulator,selected:true};
                                $scope.filter.emulators.push(emuFilter);
                            } else
                            {
                                emuFilter.selected = true;
                            }
                        }
                        emu.forEach(game => {
                            var lgame = $scope.games.find(g => {return g.name == game.name && g.emulator == game.emulator });
                            if(lgame == null)
                            {
                                game.releasedate = game.releasedate ? new Date(Date.parse(game.releasedate)) : null;
                                game.lastplayed = game.lastplayed ? new Date(Date.parse(game.lastplayed)) : null;
                                $scope.games.push(game);
                            } else
                            {
                                lgame.playCount = game.playCount;
                                lgame.dirTree = game.dirTree;
                                lgame.groupings = game.groupings;
                                lgame.lastplayed = game.lastplayed ? new Date(Date.parse(game.lastplayed)) : null;
                                lgame.memory = game.memory;
                                lgame.playCount = game.playCount;
                                lgame.states = game.states;
                                lgame.cheats = game.cheats;
                                lgame.releasedate = game.releasedate ? new Date(Date.parse(game.releasedate)) : null;
                            }
                        });
                        console.log(emu);
                    });
                }
                console.log(response.data);
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
         * Controller used to view Application details.
         * @param build The build containing the name, description, and functions.
         * 
         **/
        function GameController($scope, $mdDialog, $http, Upload, game) {
            $scope.game = game;
            $scope.selectedCheat = {};
            $scope.edit = false;

            $scope.toggleEdit = function() {
                $scope.edit = !$scope.edit;
            }

            $scope.update = function() {
                delete $scope.game['cheats'];
                if($scope.game.uploadImage != null)
                {
                    console.log($scope.game.uploadImage);
                    Upload.upload({
                        url:'/updateGameInfo',
                        data: {
                            file: $scope.game.uploadImage,
                            game: JSON.stringify($scope.game)
                        }
                    }).then((resp) => { console.log('Success ' + resp.config.data.file.name + 'uploaded. Response: ' + resp.data);},
                        (err) => {console.log('Error status: ' + resp.status);},
                        (evt) => { var progressPercentage = parseInt(100.0 * evt.loaded / evt.total);console.log('progress: ' + progressPercentage + '% ' + evt.config.data.file.name);}
                    );

                } else
                {
                    $http({
                        transformRequest: angular.identity,
                        method: 'POST',
                        url: '/updateGameInfo',
                        params: {
                            game: JSON.stringify($scope.game)
                        }
                    }).then(function(response) {
                        console.log(response.data);
                    });
                }
            }

            $scope.saveCheat = function() {
                $http({
                    transformRequest: angular.identity,
                    method: 'POST',
                    url: '/updateCheat',
                    params: {
                        cheat: JSON.stringify($scope.selectedCheat)
                    }
                }).then(function(response) {
                    console.log(response.data);
                    if(response.data.success)
                    {
                        alert("Cheat updated successfully");
                    }
                });
            };
            
            $scope.addCheatRow = function() {
                $scope.selectedCheat.cheats.push({desc:'',code:'',enable:false});
            };
            
            $scope.deleteCheat = function(cheat) {
                var index = $scope.selectedCheat.cheats.indexOf(cheat);
                $scope.selectedCheat.cheats.splice(index,1);
            };

            $scope.filter = {sortType:'enable',sortReverse:false};
            $scope.hide = function() {
                $mdDialog.hide();
            };

            $scope.cancel = function() {
                console.log($scope.selectedCheat);
                $mdDialog.cancel();
            };

            $scope.action = function(action) {
                console.log(action);
                console.log($scope.selectedCheat);
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

        $scope.loadEmulators();

});
