/* global describe, it */
const app = require('../dist/scripts/app').default
const request = require('supertest').agent(app.listen())
const should = require('chai').should()
const Random = require('mockjs').Random

describe('Account', () => {
  let user = { fullname: Random.cname(), email: Random.email(), password: Random.word(6) }
  let validUser = (user) => {
    user.should.be.a('object').have.all.keys(['id', 'fullname', 'email'])
  }
  let validUserForSearch = (user) => {
    user.should.be.a('object').have.all.keys(['id', 'fullname', 'email'])
  }
  let validPagination = (pagination) => {
    pagination.should.be.a('object').contain.all.keys(['cursor', 'limit', 'total'])
  }
  it('/account/register', (done) => {
    request.post('/account/register')
      .send(user)
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        console.log(err)
        should.not.exist(err)
        validUser(res.body.data)
        user.id = res.body.data.id
        done()
      })
  })
  it('/account/count', (done) => {
    request.get('/account/count')
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        res.body.data.should.to.be.a('number').above(0)
        done()
      })
  })
  it('/account/list', (done) => {
    request.get('/account/list')
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        let { data, pagination } = res.body
        data.should.be.a('array').have.length.above(0)
        data.forEach(item => {
          validUserForSearch(item)
        })
        validPagination(pagination)
        done()
      })
  })
  it('/account/login', done => {
    request.post('/account/login')
      .send({ email: user.email, password: user.password })
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        validUser(res.body.data)
        done()
      })
  })
  it('/account/info', done => {
    request.get('/account/info')
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        validUser(res.body.data)
        done()
      })
  })
  it('/account/logout', done => {
    request.get('/account/logout')
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        res.body.data.should.be.a('object').have.all.keys({ id: user.id })
        done()
      })
  })
  it('/account/info', done => {
    request.get('/account/info')
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        should.not.exist(res.body.data)
        done()
      })
  })
  it('/account/remove', (done) => {
    request.get('/account/remove')
      .query({ id: user.id })
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        res.body.data.should.eq(1)
        done()
      })
  })
})
