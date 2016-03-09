var fs = require('fs');
var path = require('path');

module.exports = function (directoryForGeneratedPackagesFile, packageName, watchDirectories) {
    var packageObject = {};
    if (typeof watchDirectories != 'object') {
        watchDirectories = [watchDirectories];
    }

    // Fulfill paths to directories being watched
    watchDirectories = watchDirectories.map(function(item) {
        return path.resolve(directoryForGeneratedPackagesFile, item);
    });

    // generate root container for packages
    var packageContainerNode = convertPathToObject(packageObject, packageName);

    //collect all modules
    var sourcePaths = getSourcePaths(watchDirectories);

    // create function with closures being executed for each module

    var processModulePath = function(action, modulePath) {
        var watchDirectory = watchDirectories.find(function(directory) {
            return (directory.indexOf(modulePath) == 0);
        });
        if (!watchDirectory) {
            throw 'Path is not in watched directory: ' + modulePath;
        }
        addModuleToPackageObject(watchDirectory, packageContainerNode, modulePath);
    }



    // set each collected module as package
    sourcePaths.forEach(function (modulePath) {
        processModulePath('add', modulePath);
    });

    // prepare package object to flush into packages.js
    var packagesContent = 'var packages = ' + JSON.stringify(packageObject, null, 4).replace(/"/g, '') + '\n'
        + 'module.exports = function init() {'
        + '        for (var propName in packages) {'
        + '            global[propName] = packages[propName];'
        + '        break;'
        + '        }'
        + '}';
    packagesContent = packagesContent.replace(/propertyNameForReplace.*?:/g, '');
    fs.writeFileSync(path.resolve(directoryForGeneratedPackagesFile, 'packages.js'), packagesContent);
    
    return processModulePath;
}


function locatePackage(object, path, delimiter) {
    var pathParts = path.split('.');
    var propertyName = null;
    for(var pathPartsIndex = 0; pathPartsIndex < pathParts.length; pathPartsIndex++) {
        propertyName = pathParts[pathPartsIndex];
        if (object.hasOwnProperty(propertyName)) {
            object = object[propertyName];
        } else {
            return null;
        }
    }
    return object;
}

function convertPathToObject(packageObject, packageName) {
    var packageParts = packageName.split('.');
    return packageParts.reduce(function (previousValue, currentValue, index, array) {
        previousValue[currentValue] = {};
        return previousValue[currentValue];
    }, packageObject);
}

function getSourcePaths(seekPaths) {
    var modulePaths = [];
    var dirStack = [''];
    seekPaths.forEach(function (rootPath) {
        do {
            var currentDir = path.resolve(rootPath, dirStack.pop());
            var items = fs.readdirSync(currentDir);
            items.forEach(function (item) {
                item = path.resolve(currentDir, item);
                var stat = fs.statSync(item);
                if (stat.isDirectory()) {
                    if (path.basename(item) == 'node_modules') {
                        return;
                    }
                    dirStack.push(item);
                } else {
                    if (path.extname(item) == '.js') {
                        modulePaths.push(item);
                    }
                }
            })
        } while (dirStack.length > 0);
    });
    return modulePaths;
}

function addModuleToPackageObject(watchedDirectory, packageObject, modulePath) {
    modulePath = path.relative(watchedDirectory, modulePath);
    var packageParts = modulePath.split(path.sep);
    packageParts.reduce(function (previousItem, currentItem, index, array) {
            if (index < array.length - 1) {
                if (!previousItem.hasOwnProperty(currentItem)) {
                    previousItem[currentItem] = {};
                }
            }
            else {
                currentItem = path.basename(currentItem, '.js');
                previousItem['propertyNameForReplace' + currentItem] = 'get ' + currentItem + '() {'
                    + 'return require(\'./' + modulePath + '\')'
                    + '}';
            }
            return previousItem[currentItem];
        },
        packageObject
    );
}

