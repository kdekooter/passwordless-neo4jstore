const neo4j = require('neo4j-driver').v1
const bcrypt = require('bcryptjs')
let session
const nodeLabel = 'PasswordLessToken'

function Neo4JStore (connectionUri, authentication) {
  let driver = neo4j.driver(connectionUri, authentication)
  session = driver.session()
}

/**
 * Checks if the provided token / user id combination exists and is
 * valid in terms of time-to-live. If yes, the method provides the
 * the stored referrer URL if any.
 * @param  {String}   token to be authenticated
 * @param  {String}   uid Unique identifier of an user
 * @param  {Function} callback in the format (error, valid, referrer).
 * In case of error, error will provide details, valid will be false and
 * referrer will be null. If the token / uid combination was not found
 * found, valid will be false and all else null. Otherwise, valid will
 * be true, referrer will (if provided when the token was stored) the
 * original URL requested and error will be null.
 */
Neo4JStore.prototype.authenticate = function (token, uid, callback) {
  if (!token || !uid || !callback) {
    throw new Error('TokenStore:authenticate called with invalid parameters')
  }

  let query = `MATCH (t:${nodeLabel} {uid: t.uid}) WHERE t.ttl > {now} RETURN t`
  let params = {uid: uid, now: new Date().getTime()}
  session.run(query, params)
  .then(queryResult => {
    if (queryResult.records && queryResult.records.length === 1) {
      let hashedToken = queryResult.records[0]._fields[0].properties.hashedToken
      let originUrl = queryResult.records[0]._fields[0].properties.originUrl
      
      bcrypt.compare(token, hashedToken, function (error, result) {
        if (error) {
          console.log(error)
          callback(error, false, null)
        } else if (result) {
          callback(null, true, originUrl || '')
        } else {
          callback(null, false, null)
        }
      })
    } else {
      callback(null, false, null)
    }
  })
  .catch(error => {
    console.log(error)
    callback(null, false, null)
  })
}

/**
 * Stores a new token / user ID combination or updates the token of an
 * existing user ID if that ID already exists. Hence, a user can only
 * have one valid token at a time
 * @param  {String}   token Token that allows authentication of _uid_
 * @param  {String}   uid Unique identifier of an user
 * @param  {Number}   msToLive Validity of the token in ms
 * @param  {String}   originUrl Originally requested URL or null
 * @param  {Function} callback Called with callback(error) in case of an
 * error or as callback() if the token was successully stored / updated
 */
Neo4JStore.prototype.storeOrUpdate = function (token, uid, msToLive, originUrl, callback) {
  if (!token || !uid || !msToLive || !callback) {
    throw new Error('TokenStore:storeOrUpdate called with invalid parameters')
  }

  let self = this

  bcrypt.hash(token, 10, function (error, hashedToken) {
    if (error) {
      console.log(error)
      return callback(error)
    }

    let body = {
      hashedToken: hashedToken,
      uid: uid,
      ttl: new Date().getTime() + msToLive,
      originUrl: originUrl,
      token: token
    }

    let query, params

    self._findUser(uid, (error, user) => {
      if (error || !user) {
        query = `
            CREATE (t:${nodeLabel} {user}) RETURN t
          `
        params = {user: body}
      } else {
        query = `
            MATCH (t:${nodeLabel}) 
            WHERE t.uid = {uid}
            SET t.hashedToken = {hashedToken}, t.ttl = {ttl}, t.originUrl = {originUrl}, t.token = {token}
            `
        params = body
      }

      session.run(query, params)
      .then(() => {
        callback()
      })
      .catch(error => {
        console.log(error)
        callback(error)
      })
    })
  })
}

/**
 * Invalidates and removes a user and the linked token
 * @param  {String}   user ID
 * @param  {Function} callback called with callback(error) in case of an
 * error or as callback() if the uid was successully invalidated
 */
Neo4JStore.prototype.invalidateUser = function (uid, callback) {
  if(!uid || !callback) {
    throw new Error('TokenStore:invalidateUser called with invalid parameters');
  }
  
  const query = `MATCH (t:${nodeLabel} {uid: {uid}}) DETACH DELETE t`
  session.run(query, {uid: uid})
  .then(() => {
    callback()
  })
  .catch((error) => {
    console.log(error)
    callback(error)
  })
}

/**
 * Removes and invalidates all tokens
 * @param  {Function} callback Called with callback(error) in case of an
 * error or as callback() if the token was successully stored / updated
 */
Neo4JStore.prototype.clear = function (callback) {
  if(!callback) {
    throw new Error('TokenStore:clear called with invalid parameters');
  }
  
  const query = `MATCH (t:${nodeLabel}) DETACH DELETE t`
  session.run(query)
  .then(() => {
    callback()
  })
  .catch((error) => {
    console.log(error)
    callback(error)
  })
}

/**
 * Number of tokens stored (no matter the validity)
 * @param  {Function} callback Called with callback(null, count) in case
 * of success or with callback(error) in case of an error
 */
Neo4JStore.prototype.length = function (callback) {

  const query = `MATCH (t:${nodeLabel}) RETURN t`

  session.run(query)
  .then(result => {
    if (result.records.length === 0) {
      callback(null, 0)
    } else {
      callback(null, result.records.length)
    }
  })
  .catch((error) => {
    console.log(error)
    callback(error)
  })
}

Neo4JStore.prototype._findUser = function (uid, callback) {

  let query = `MATCH (t:${nodeLabel} {uid: {uid}}) RETURN t`

  session.run(query, {uid: uid})
  .then(result => {
    if (result.records.length === 0) {
      callback(null, null)
    } else {
      callback(null, result.records[0]._fields[0].properties)
    }
  })
  .catch((error) => {
    console.log(error)
    callback(error)
  })
}

module.exports = Neo4JStore