# node-packagerify
Make it possible to use 'Java-style' package import instead of using require. Add require('./packages.js') to your application root file and everywhere in the project you can use package name instead of require('./../../../someDir/someSubDir/module');

NO MORE:
~~var module = require('./../../../someDir/someSubDir/module')~~

USE PACKAGERIFY:
var module = your.package.name.somePackage.someSubPackage.module;

Packagerify generates packages.js in specified folder. You have to include it into your main application file. It will inject generated packages object into global namespace.
Why to generate this file and not to use Proxy and so on? Just because I want my IDE make autocompletion when I type the package name;

![IDE autocomplete](https://raw.githubusercontent.com/statyan/node-packagerify/master/ide-autocompletion.png)

As additional benefit - you could enumerate modules in package without filesystem reading. Just use native JS.
```
for(var i in com.your.pack.module) {
    ...
}
```
(Especially useful for AngularJS when registering controllers,directives, etc);
Note: for client-side usage RequireJS system is a must for now.

From 0.0.7 version the grunt task included. So, to packagerify your project simply add to Gruntfile.js packagerify config:

### Example config
Gruntfile.js
```
grunt.initConfig({
    packagerify: {
        default: {
            options: {
                packageName: 'com.example.packagename',
                packagesFileDir: '',
                watchSourceDirs: ['src'],
            }
        }
    }
});

grunt.loadNpmTasks('packagerify');

grunt.registerTask('default', ['packagerify']);

```
- packageName - dot-separated string (usually your domain in reversed order + package name). For example: com.google.myPackage;
- packagesFileDir - [not required] path to folder where packages.js file will be created (By default - the Gruntfile.js folder);
- watchSourceDirs - string or array of strings. Each string is a relative path to packagesFileDir. Each watched directory will populate its sources to packages.js

Assuming we have project structure:
```
root_dir/src/lib/MyClass1.js
root_dir/src/lib/MyClass2.js
```
Grunt task setup:
```
packagerify: {
    default: {
        options: {
            packageName: 'com.example.pack',
            watchSourceDirs: ['src'],
        }
    }
}
```

packages.js injects in the global namespace this files and they could be accessed in next way:
```
var MyClass1 = com.example.pack.lib.MyClass1

var MyClass2 = com.example.pack.lib.MyClass2
```
 For ES6:
```
class MyDescendantClass extends com.example.pack.lib.MyClass2 {
    ...
}
```

No 'require('.........')' needed!

### First step
`npm install packagerify`

### Second step
- setup grunt config as showed earlier<br><br>
OR<br><br>
- use Packagerify class directly (this will also start file watcher):
```
var Packagerify = require('packagerify');
var packagerify = new Packagerify({
    packageName: 'com.example.packagename',
    packagesFileDir: '',
    watchSourceDirs: ['src']
});
```



