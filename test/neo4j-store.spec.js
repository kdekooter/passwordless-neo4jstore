const Neo4jStore = require('../lib/neo4j-store')
const neo4j = require('neo4j-driver').v1

const standardTests = require('passwordless-tokenstore-test')

const NEO4J_URL = process.env.NEO4J_URL
const NEO4J_USER = process.env.NEO4J_USER
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD

function TokenStoreFactory () {
  return new Neo4jStore(NEO4J_URL, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD))
}

const tokenStore = TokenStoreFactory()

function beforeEachTest (done) {
  tokenStore.clear(() => {
    done()
  })
}

function afterEachTest (done) {
  tokenStore.clear(() => {
    done()
  })
}

standardTests(TokenStoreFactory, beforeEachTest, afterEachTest)