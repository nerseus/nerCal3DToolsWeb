/*!
 * ConversionApp.js v1.0.0 (http://nersoftware.com/IMVUConversionTool/ConversionApp.js)
 * Copyright 2021 by ner software, LLC.
 * Licensed under the MIT license.
 *
 * This repo is hosted: https://github.com/nerseus/nerCal3DTools
 * A working example is also available here: http://nersoftware.com/IMVUConversionTool/nerImvuConversion.zip
 */

// The following will turn off the eslint rule for "gratuitous parentheses". Removing below may show warnings in Visual Studio.
/* eslint no-extra-parens: ["error", "all", { "nestedBinaryExpressions": false }] */

//************************************************************************************************************
//  This file is the main app/directives/controller (angularJS) for the main conversion webpage/utility.
//  This file relies on libraries:
//      Common.js
//      Cal3D.js
//
//  Directives:
//      input       - overrides type="file" behavior to allow drag-drop binding.
//      dropable    - replacement for an area that allows drag-drop binding.
//
//  Scope:
//      globalData  - instance of Data() to hold raw file lists, validated file lists, etc.
//      actions     - instance of Actions() to hold all hooks for buttons and callbacks.
//************************************************************************************************************

angular.module('app', [])
    .directive('input', function () {
        return {
            restrict: 'E',
            scope: {
                ngModel: '=',
                ngChange: '&',
                type: '@'
            },
            link: function (scope, element, attrs) {
                if (scope.type.toLowerCase() !== 'file') {
                    return;
                }

                element.bind('change', function () {
                    let files = element[0].files;
                    scope.ngModel = files;
                    scope.$apply();
                    scope.ngChange();
                });
            }
        };
    })
    .directive('dropable', function () {
        return {
            restrict: 'E',
            template: '<input type="text" disabled class="form-control" placeholder="Browse to files or drag/drop from explorer">',
            scope: {
                ngModel: '=',
                ngChange: '&'
            },
            link: function (scope, element, attrs) {
                element.on('drop', function (evt) {
                    evt.stopPropagation();
                    evt.preventDefault();

                    if (evt.originalEvent.dataTransfer) {
                        if (evt.originalEvent.dataTransfer.files.length > 0) {
                            let files = evt.originalEvent.dataTransfer.files;
                            scope.ngModel = files;
                            scope.$apply();
                            scope.ngChange();
                        }
                    }
                });

                // Must prevent some drag events from default behavior if we want drop to work.
                element.on('dragover', ignoreEvent);
                element.on('dragenter', ignoreEvent);
                element.on('dragend', ignoreEvent);
                element.on('dragleave', ignoreEvent);

                function ignoreEvent(evt) {
                    evt.preventDefault();
                    evt.stopPropagation();
                }
            }
        };
    })
    .controller('ConversionController', function ($scope, $timeout) {
        $scope.username = 'nerseus';
        $scope.atSign = '@';
        $scope.emailSuffix = '.com';
        $scope.mailTo = "mailto:" + $scope.username + $scope.atSign + "gmail" + $scope.emailSuffix + "?subject=Comment%20on%20the%20IMVUConversionTool&body=message%20goes%20here";

        function Data() {
            this.conversion = {
                rawFiles: [],
                files: [],
                flipUVs: false,
                inProgressIndex: 0,
                showProgress: false,
                validExtensions: ['xaf', 'xmf', 'xsf']
            };

            this.xmf = {
                rawFiles: [],
                files: [],
                inProgressIndex: 0,
                showProgress: false,
                validExtensions: ['xmf']
            };

            this.xaf = {
                rawFiles: [],
                files: [],
                inProgressIndex: 0,
                showProgress: false,
                validExtensions: ['xaf'],
                offsetTime: 1.0,
                lengthenTime: 9999999,
                stretchFactor: 2.0
            };
        }

        function Actions() {
            this.loadRawFiles = loadRawFiles;
            this.removeFile = removeFile;
            this.clearFiles = clearFiles;
            this.sendEmail = sendEmail;

            // Conversion
            this.convertFiles = convertFiles;

            // XMF
            this.mergeFiles = mergeFiles;

            // XAF:
            this.reverseAndAppend = reverseAndAppend;
            this.unTwitchPose = unTwitchPose;
            this.offset = offset;
            this.lengthen = lengthen;
            this.stretch = stretch;
        }

        $scope.globalData = new Data();
        $scope.actions = new Actions();

        //************************************************************************************************************
        // Loads the files from a file input control. Shows selected files and updates arrayOfSavedFiles.
        // Params:
        //       files  : The array of files returned by the browser's file input.
        //************************************************************************************************************
        function loadRawFiles(dataObject) {
            if (dataObject.rawFiles.length === 0) return;

            dataObject.showProgress = false;

            for (var i = 0; i < dataObject.rawFiles.length; i++) {
                var file = dataObject.rawFiles[i];
                if (validExtension(file.name, dataObject.validExtensions, true)) {
                    // Can't compare directly by path (for browser security).
                    // Check available properties.
                    var fileAlreadyInList = dataObject.files.some(function (existingFile) {
                        return isFileMatch(existingFile, file);
                    });

                    if (!fileAlreadyInList) {
                        dataObject.files.push(file);
                    }
                    else {
                        toastr.info("File already in list: " + file.name);
                    }
                }
            }

            $timeout(function () {
            });
        }

        function clearFiles(dataObject) {
            dataObject.files.splice(0);
        }

        function removeFile(dataObject, file) {
            var matchIndex = dataObject.files.indexOf(file);
            if (matchIndex >= 0) {
                dataObject.files.splice(matchIndex, 1);
                dataObject.showProgress = false;
            }
        }

        //************************************************************************************************************
        // Conversion
        //************************************************************************************************************
        function convertFiles() {
            $scope.globalData.conversion.showProgress = true;
            $scope.globalData.conversion.inProgressIndex = 0;

            for (var i = 0; i < $scope.globalData.conversion.files.length; i++) {
                var reader = new FileReader();
                reader.onload = function (e) {
                    $timeout(function () {
                        $scope.globalData.conversion.inProgressIndex++;

                        var fileData = e.target.result;
                        var extension = getExtension(e.target.filename);

                        if (extension === 'xaf') {
                            var xaf = new XAF(fileData);
                            saveFile(xaf.toFormattedString(), appendToFilename(e.target.filename, '_converted'));
                        } else if (extension === 'xmf') {
                            var xmf = new XMF(fileData);
                            // TTTT Not handling $scope.globalData.conversion.flipUVs yet.
                            saveFile(xmf.toFormattedString(), appendToFilename(e.target.filename, '_converted'));
                        } else if (extension === 'xsf') {
                            var xsf = new XSF(fileData);
                            saveFile(xsf.toFormattedString(), appendToFilename(e.target.filename, '_converted'));
                        }

                        conversionProgressBar.style.width = calcProgress($scope.globalData.conversion.inProgressIndex, $scope.globalData.conversion.files.length);
                    });
                };

                reader.filename = $scope.globalData.conversion.files[i].name;
                reader.readAsText($scope.globalData.conversion.files[i]);
            }
        }

        //************************************************************************************************************
        // XMF
        //************************************************************************************************************
        function mergeFiles() {
            $scope.globalData.xmf.showProgress = true;
            $scope.globalData.xmf.inProgressIndex = 0;

            let allXmfs = [];
            for (var i = 0; i < $scope.globalData.xmf.files.length; i++) {
                var reader = new FileReader();
                reader.onload = function (e) {
                    $timeout(function () {
                        $scope.globalData.xmf.inProgressIndex++;

                        var fileData = e.target.result;
                        let xmf = new XMF(fileData);
                        allXmfs.push(xmf);

                        let mergedXmf = allXmfs[0];
                        if (allXmfs.length === $scope.globalData.xmf.files.length) {
                            for (let j = 1; j < allXmfs.length; j++) {
                                mergedXmf.merge(allXmfs[j]);
                            }

                            // All files are read in. Merge and save.
                            saveFile(mergedXmf.toFormattedString(), 'merged.xmf');
                        }

                        xmfProgressBar.style.width = calcProgress($scope.globalData.xmf.inProgressIndex, $scope.globalData.xmf.files.length);
                    });
                };

                reader.filename = $scope.globalData.xmf.files[i].name;
                reader.readAsText($scope.globalData.xmf.files[i]);
            }
        }

        //************************************************************************************************************
        // XAF functions
        //************************************************************************************************************

        // processFiles is re-used by all of the xaf functions to update progress, read files, etc.
        function processFiles(dataObject, progressControl, func) {
            dataObject.showProgress = true;
            dataObject.inProgressIndex = 0;

            for (var i = 0; i < dataObject.files.length; i++) {
                var reader = new FileReader();
                reader.onload = function (e) {
                    $timeout(function () {
                        dataObject.inProgressIndex++;

                        var fileData = e.target.result;
                        func(fileData, e.target.filename);

                        progressControl.style.width = calcProgress(dataObject.inProgressIndex, dataObject.files.length);
                    });
                };

                reader.filename = dataObject.files[i].name;
                reader.readAsText(dataObject.files[i]);
            }
        }

        function reverseAndAppend() {
            processFiles($scope.globalData.xaf, xafProgressBar, function (fileData, filename) {
                let xaf = new XAF(fileData);
                xaf.reverseAndAppend();
                saveFile(xaf.toFormattedString(), appendToFilename(filename, '_reversed'));
            });
        }

        function unTwitchPose() {
            processFiles($scope.globalData.xaf, xafProgressBar, function (fileData, filename) {
                let xaf = new XAF(fileData);
                xaf.untwitch();
                saveFile(xaf.toFormattedString(), appendToFilename(filename, '_untwitched'));
            });
        }

        function offset() {
            processFiles($scope.globalData.xaf, xafProgressBar, function (fileData, filename) {
                let xaf = new XAF(fileData);
                xaf.offset($scope.globalData.xaf.offsetTime);
                saveFile(xaf.toFormattedString(), appendToFilename(filename, '_offset'));
            });
        }

        function lengthen() {
            processFiles($scope.globalData.xaf, xafProgressBar, function (fileData, filename) {
                let xaf = new XAF(fileData);
                xaf.lengthenLastFrame($scope.globalData.xaf.lengthenTime);
                saveFile(xaf.toFormattedString(), appendToFilename(filename, '_lengthened'));
            });
        }

        function stretch() {
            processFiles($scope.globalData.xaf, xafProgressBar, function (fileData, filename) {
                let xaf = new XAF(fileData);
                xaf.stretch($scope.globalData.xaf.stretchFactor);
                saveFile(xaf.toFormattedString(), appendToFilename(filename, '_stretched'));
            });
        }

        //************************************************************************************************************
        // Send email
        //************************************************************************************************************
        function sendEmail() {
            var href = "mailto:" + $scope.username + $scope.atSign + "gmail" + $scope.emailSuffix + "?subject=Comment%20on%20the%20IMVUConversionTool&body=message%20goes%20here";
            document.location = href;
        }
    });
