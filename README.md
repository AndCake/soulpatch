# soulpatch

A tiny CLI compiler for Mustache files to produce CommonJS javascript modules.

## Installation

```bash
$ npm install soulpatch
```

## Usage

```
soulpatch [--outputdir <output-directory>] <templates> [<source-directory>]

        [-o, --outputdir] :: the directory to write the individual files into
        [-h, --help]      :: this help
```

Example:

```bash
$ soulpatch -o ./dest 'src/**/*.mustache' src
```

__Note:__ soulpatch supports globbing as described at https://www.npmjs.com/package/glob.



### Keywords

none
