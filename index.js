var fs = require('fs');
var path = require('path');

module.exports = function (options) {

    var watchSourceDirs = options.watchSourceDirs;
    var packageObject = {};
    if (typeof watchSourceDirs != 'object') {
        watchSourceDirs = [watchSourceDirs];
    }

    // Fulfill paths to directories being watched
    watchSourceDirs = watchSourceDirs.map(function (item) {
        return path.resolve(options.packagesFileDir, item);
    });

    // generate root container for packages
    var packageContainerNode = convertPathToObject(packageObject, options.packageName);

    //collect all modules
    var sourcePaths = getSourcePaths(watchSourceDirs);

    // create function with closures being executed for each module

    var processModulePath = function (action, modulePath) {
        var watchDirectory = watchSourceDirs.find(function (directory) {
            return (modulePath.indexOf(directory) == 0);
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

    savePackageObject(packageObject, options.packagesFileDir);

    var fileWatcherFunction = function (action, modulePath) {
        processModulePath(action, modulePath);
        savePackageObject(packageObject, options.packagesFileDir);
    }


    return fileWatcherFunction;
}


function savePackageObject(packageObject, directory) {
    // prepare package object to flush into packages.js
    var packagesContent = 'var packages = ' + JSON.stringify(packageObject, null, 4).replace(/"/g, '') + '\n'
        + 'for (var propName in packages) {'
        + '   global[propName] = packages[propName];'
        + '   break;'
        + '}'
        + 'module.exports = packages;';
    packagesContent = packagesContent.replace(/propertyNameForReplace.*?:/g, '');
    fs.writeFileSync(path.resolve(directory, 'packages.js'), packagesContent);
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
    seekPaths.forEach(function (rootPath) {
        var dirStack = [''];
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
    modulePath = path.relative(path.dirname(watchedDirectory), modulePath);
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

