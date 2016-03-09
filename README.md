# node-packagerify
Make it possible to use 'Java-style' package import instead of using require. Add require('./packages.js') to your application root file and everywhere in the project you can use package name instead of require('./../../../someDir/someSubDir/module');

~~var module = require('./../../../someDir/someSubDir/module')~~

var module = your.package.name.somePackage.someSubPackage.module;

Node-packagerify generates packages.js in your project folder. You have to include it into your main application file.
Why to generate this file and not to use Proxy and so on? Just because I want my IDE make autocompletion when I type the package name;

![IDE autocomplete](https://raw.githubusercontent.com/statyan/node-packagerify/master/ide-autocompletion.png)

### Example config
```
require('packagerify')({
    packageName: 'net.wjc.orm',
    packagesFileDir: __dirname,
    watchSourceDirs: [
        'shared',
        'classes'
    ]
});

require('./packages');

/*
* Assuming we have project structure:
* root_dir/shared/models/Project.js
*/

var project = new net.wjc.orm.shared.models.Project;
```
 For ES6:
```
class ProjectExt extends net.wjc.orm.shared.models.Project {
    ...
}
```



### First step
`npm install packagerify`

### Second step
```
var functionForWatchFileEvent = require('packagerify')(options);
```
Where *options* is object :
```
{
    packageName: 'your.package.basename',
    packagesFileDir: __dirname,
    watchSourceDirs: [
        'your_dir_with_code1',
        'your_dir_with_code2'
    ]
}
```
- packageName: the base name for you package. You can use reversed domain name of your organization: 'com.google'
- packagesFileDir: where the file 'packages.js' would be generated
- watchSourceDirs: single string or array of strings with folders names relative to 'packagesFileDir' path. Files in this folders (and theri subfolders) would become a packages

This **functionForWatchFileEvent** goes with (action, modulePath) params, where action is a string and can be 'add' or 'remove' and modulePath - full path to file which has to be added or removed from Packages object. You can use it in grunt or gulp task with chokidar package for example




