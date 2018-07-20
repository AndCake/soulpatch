#!/usr/bin/env node
let nopt = require('nopt');
let path = require('path');
let glob = require('glob');

let compile = require('../src/mustache2js');

// remove utf-8 byte order mark, http://en.wikipedia.org/wiki/Byte_order_mark
function removeByteOrderMark(text) {
	if (text.charCodeAt(0) === 0xfeff) {
		return text.substring(1);
	}
	return text;
}

function run(templates, outputDir, basePath) {
    let fs = require('fs');
	let mkderp = require('mkdirp');
	
    templates.forEach(template => {
		let code = fs.readFileSync(template, 'utf8');
		code = removeByteOrderMark(code);
        let target = path.dirname(template).replace(basePath, '');
        if (target[0] === '/') target = target.substr(1);
        let targetName = path.basename(template).split('.').slice(0, -1).join('.');
        mkderp.sync(path.join(outputDir, target));
        try {
            fs.writeFileSync(path.join(outputDir, target, targetName + '.js'), compile(code), 'utf8');
            console.log('Compiled ' + template);
        } catch (failure) {
            console.log('Failed ' + template + ': ' + failure);
            process.exit(1);
        }
    });
}

let options = {
    outputdir: path,
    help: true
},
shortOptions = {
    'o': ['--outputdir'],
    'h': ['--help']
};
options = nopt(options, shortOptions);

if (options.help) {
    let package = require('../package.json');
    let usage = `${package.name} [--outputdir <output-directory>] <templates> [<source-directory>]

	[-o, --outputdir] :: the directory to write the individual files into
	[-h, --help]      :: this help

Example:

    ${package.name} -o ./dest 'src/**/*.mustache' src

Note:

    ${package.name} supports globbing as described https://www.npmjs.com/package/glob.
`;

    console.log(usage);
    process.exit(0);
}

glob(options.argv.remain[0], {}, function(err, files) {
	if (!err) {
		let basePath = options.argv.remain[1] || files.map(file => path.dirname(file)).reduce((a, b) => {
			if (!a) return b;
            while (b.indexOf(a) !== 0 && a.length > 0) { a = a.split('/').slice(0, -1).join('/'); } return a;
        });
		run(files, options.outputdir, basePath);
	} else {
		throw new Error(err);
	}
});
