/**
 * Created by statyan on 25.04.16.
 */

var fs = require('fs');
var path = require('path');
var chokidar = require('chokidar');

/**
 *
 * @param options is object {
 *    packageName: string, usually reversed domain name of your organization. For example: 'com.google'
 *    packagesFileDir: string, path to folder where 'packages.js' would be generated
 *    watchSourceDirs: string or array of strings, paths *relative to packagesFileDir*
 * }
 */

function Packagerify(options) {
    // Check options
    if (!options.watchSourceDirs) {
        throw new Error('Packagerify required option "watchSourceDirs" is not defined');
    }
    if (!options.packagesFileDir) {
        throw new Error('Packagerify required option "packagesFileDir" is not defined');
    }
    if (!options.packageName || (options.packageName.indexOf('.') < 0)) {
        throw new Error('Packagerify package name must consist at least of two dot-separeated parts. For exapmle: "com.yourpackagename".');
    }
    var watchSourceDirs = options.watchSourceDirs;
    if (typeof watchSourceDirs != 'object') {
        watchSourceDirs = [watchSourceDirs];
    }

    // init packagerify object
    this.packageName = options.packageName;
    this.generatedPackagesFileDir = options.packagesFileDir;
    this.watchSourceDirs = watchSourceDirs.map(function (item) {
        return path.resolve(options.packagesFileDir, item);
    });

    this.packageObjectRoot = {};
    this.packageObjectInjectionPoint = buildPackageObject(this.packageObjectRoot, this.packageName);

    console.log('Starting Packagerify');
    console.log('Process files in watched directories');
    //var sourcePaths = getSourcePaths(this.watchSourceDirs);

    var that = this;
    /*
     sourcePaths.forEach(function (modulePath) {
     that.processModulePath('add', modulePath);
     });
     this.serialize();
     */
    this.isReady = false;
    console.log('Initialize file watcher');
    var watcher = chokidar.watch(this.watchSourceDirs);
    watcher.on('all', function (event, modulePath) {
        switch (event) {
            case 'add':
                that.fileWatcherFunction('add', modulePath);
                break;
            case 'unlink':
                that.fileWatcherFunction('removeModule', modulePath);
                break;
        }
    });
    watcher.on('ready', function () {
        that.isReady = true;
        that.serialize();
        console.log('Packagerify is running!');
    });
    watcher.on('unlinkDir', function (modulePath) {
        that.fileWatcherFunction('removePackage', modulePath);
    })
}

module.exports = Packagerify;

Packagerify.prototype.processModulePath = function (action, modulePath) {
    var watchDirectory = this.watchSourceDirs.find(function (directory) {
        return (modulePath.indexOf(directory) == 0);
    });
    if (!watchDirectory) {
        throw 'Path is not in packagerify watched directory: ' + modulePath;
    }
    if ((action != 'removePackage') && (path.extname(modulePath) != '.js')) {
        return;
    }
    // build relative to watched directory path. This path will be a package path
    modulePath = path.relative(path.dirname(watchDirectory), modulePath);
    modulePath = modulePath.substring(modulePath.indexOf(path.sep) + 1);
    switch (action) {
        case 'add':
            this.addModuleToPackageObject(watchDirectory, modulePath);
            break;
        case 'removeModule':
            this.removeModuleFromPackageObject(watchDirectory, modulePath, false);
            break;
        case 'removePackage':
            this.removeModuleFromPackageObject(watchDirectory, modulePath, true);
            break;

    }
}

Packagerify.prototype.addModuleToPackageObject = function (watchedDirectory, modulePath) {
    var packageParts = modulePath.split(path.sep);
    var requirePath = path.relative(this.generatedPackagesFileDir, watchedDirectory);
    requirePath = path.join(requirePath, modulePath);
    // Build property tree branch for current module and put it to packageInjectionPoint
    packageParts.reduce(function (previousItem, currentItem, index, array) {
            if (index < array.length - 1) {
                if (!previousItem.hasOwnProperty(currentItem)) {
                    previousItem[currentItem] = {};
                }
            } else {
                currentItem = path.basename(currentItem, '.js');
                if (previousItem.hasOwnProperty(currentItem)) {
                    delete previousItem[currentItem];
                }
                // generate property name which will be replaced after JSON.stringify
                previousItem['propertyNameForReplace' + currentItem] = 'get ' + currentItem + '() {'
                    + 'return require(\'./' + requirePath +'\')'
                    + '}';
                console.log('Adding module: ' + modulePath);
            }
            return previousItem[currentItem];
        },
        this.packageObjectInjectionPoint
    );
}

Packagerify.prototype.removeModuleFromPackageObject = function (watchedDirectory, modulePath, isDirectory) {
    var packageParts = modulePath.split(path.sep);
    var packageNode = this.packageObjectInjectionPoint;
    for (var i = 0; i < packageParts.length; i++) {
        var part = packageParts[i];
        if (i < packageParts.length - 1) {
            packageNode = packageNode[part];
            if (!packageNode) {
                break;
            }
            continue;
        }
        var propName;
        if (isDirectory) {
            propName = part;
        } else {
            propName = 'propertyNameForReplace' + path.basename(part, '.js');
        }
        delete packageNode[propName];
        if (isDirectory) {
            console.log('Removing package: ' + modulePath);
        } else {
            console.log('Removing module: ' + modulePath);
        }
    }
}

Packagerify.prototype.serialize = function () {
    if (!this.isReady) {
        return;
    }
    var packagesContent = '"use strict"\n'
        + 'var packages = ' + JSON.stringify(this.packageObjectRoot, null, 4).replace(/"/g, '') + '\n\n\n'
        + "require('packagerify').injectPackage(packages, '" + this.packageName + "');\n"
        + 'module.exports = packages;';
    packagesContent = packagesContent.replace(/propertyNameForReplace.*?: /g, '');
    fs.writeFileSync(path.resolve(this.generatedPackagesFileDir, 'packages.js'), packagesContent);
}


Packagerify.prototype.fileWatcherFunction = function (action, modulePath) {
    this.processModulePath(action, modulePath);
    this.serialize();
}


/*********
 UTILS
 **********/

function buildPackageObject(packageObjectRoot, packageName) {
    var packageParts = packageName.split('.');
    return packageParts.reduce(function (previousValue, currentValue, index, array) {
        previousValue[currentValue] = {};
        return previousValue[currentValue];
    }, packageObjectRoot);
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


function objectHasOtherProperties(obj, currentPropertyName) {
    for (var propertyName in obj) {
        if (propertyName == currentPropertyName) {
            continue;
        }
        if (propertyName in Object) {
            continue;
        }
        return true;
    }
    return false;
}

module.exports.injectPackage = function (packageObject, packageName) {
    var injectTarget = null;
    try {
        injectTarget = global;
    } catch (e) {
        console.log(e);
    }
    if (!injectTarget) {
        try {
            injectTarget = window;
        } catch (e) {
            console.log(e);
        }
        if (!injectTarget) {
            console.log('Global namespace is not defined');
            return;
        }
    }
    var packageNameParts = packageName.split('.');
    var packageItem = packageObject;
    for (var i in packageNameParts) {
        var part = packageNameParts[i];
        if (!injectTarget.hasOwnProperty(part)) {
            injectTarget[part] = packageItem[part];
            return;
        }
        injectTarget = injectTarget[part];
        packageItem = packageItem[part];
    }
    throw new Error('Package ' + packageName + ' already loaded to global namespace. Check your packages and it names.');
}
