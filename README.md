[![NPM version][npm-version-image]][npm-url]
[![MIT License][license-image]][license-url]

# Passwordless-Neo4JStore

This module provides token storage for [Passwordless](https://github.com/florianheinemann/passwordless), a node.js module for express that allows website authentication without password using verification through email or other means. Visit the project's website https://passwordless.net for more details.

Tokens are stored in a Neo4J database and are hashed and salted using [bcryptjs](https://www.npmjs.com/package/bcryptjs). 

## Usage

First, install the module:

`$ npm install passwordless-neo4jstore --save`

Afterwards, follow the guide for [Passwordless](https://github.com/florianheinemann/passwordless). A typical implementation may look like this:

```javascript
const passwordless = require('passwordless');
const Neo4jStore = require('passwordless-neo4jstore');
const neo4j = require('neo4j-driver').v1

var neo4jUrl = 'bolt://localhost:7687';
passwordless.init(new Neo4jStore(neo4jUrl, neo4j.auth.basic('<username>', '<password>')));

passwordless.addDelivery(
    function(tokenToSend, uidToSend, recipient, callback) {
        // Send out a token
    });
    
app.use(passwordless.sessionSupport());
app.use(passwordless.acceptToken());
```

## Hash and salt
As the tokens are equivalent to passwords (even though they do have the security advantage of only being valid for a limited time) 
they have to be protected in the same way. passwordless-mongostore uses bcryptjs with automatically created random salts. To generate the salt 10 rounds are used.

## Tests

Set the following environment variables: `NEO4J_URL`, `NEO4J_USERNAME` and `NEO4J_PASSWORD`.

`$ npm test`

## License

[MIT License](http://opensource.org/licenses/MIT)

## Author
Kees de Kooter

[npm-url]: https://npmjs.org/package/moment
[npm-version-image]: http://img.shields.io/npm/v/moment.svg?style=flat
[license-image]: http://img.shields.io/badge/license-MIT-blue.svg?style=flat
[license-url]: LICENSE
