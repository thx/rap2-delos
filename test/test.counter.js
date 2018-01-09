/* global describe, it */
const app = require('../dist/scripts/app').default
const request = require('supertest').agent(app.listen())
const should = require('chai').should()
const { mockUsers, prepare } = require('./helper')

describe('Counter', () => {
  let users = mockUsers()
  prepare(request, should, users)

  it('/app/counter', done => {
    request.get('/app/counter')
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        let { version, users, mock } = res.body.data
        version.should.be.a('string').not.eq('')
        users.should.be.a('number').above(0)
        mock.should.be.a('number')
        done()
      })
  })
})
