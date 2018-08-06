/* global describe, it, before */
let app = require('../dist/scripts/app').default
let request = require('supertest').agent(app.listen())
let should = require('chai').should()
let expect = require('chai').expect
let Random = require('mockjs').Random
const { Interface } = require('../dist/models')
const { mockUsers, mockRepository, prepare } = require('./helper')

describe('Interface', () => {
  let users = mockUsers()
  let repository = mockRepository()
  prepare(request, should, users, repository)

  let itf = {}
  before(done => {
    itf = {
      name: '测试用例_临时_' + Random.ctitle(6) + Math.random(),
      url: Random.url(),
      method: Random.pick(['GET', 'POST', 'PUT', 'DELETE']),
      description: Random.cparagraph(),
      lockerId: null,
      repositoryId: repository.id,
      moduleId: repository.modules[0].id
    }
    done()
  })
  let validInterface = (itf, extras = []) => {
    itf.should.be.a('object').have.all.keys(
      Object.keys(Interface.attributes).concat(extras)
    )
    itf.creatorId.should.be.a('number')
    itf.repositoryId.should.be.a('number')
    itf.moduleId.should.be.a('number')
  }

  it('/interface/create', done => {
    request.post('/interface/create')
      .send(itf)
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        validInterface(res.body.data.itf)
        itf = res.body.data.itf
        done()
      })
  })
  it('/interface/count', done => {
    request.get('/interface/count')
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        res.body.data.should.to.be.a('number').above(0)
        done()
      })
  })
  it('/interface/list', done => {
    request.get('/interface/list')
      .query({ moduleId: repository.modules[0].id })
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        let { data } = res.body
        data.should.be.a('array').have.length.within(1, 2)
        data.forEach(item => {
          validInterface(item)
        })
        done()
      })
  })
  it('/interface/get', done => {
    request.get('/interface/get')
      .query({ id: 1 })
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        validInterface(res.body.data, ['requestProperties', 'responseProperties'])
        done()
      })
  })
  it('/interface/update', done => {
    request.post('/interface/update')
      .send({ id: itf.id, name: Random.ctitle(6) })
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        res.body.data.itf.id.should.not.be.null
        done()
      })
  })
  it('/interface/lock', done => {
    request.post('/interface/lock')
      .send({ id: itf.id })
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        res.body.data.id.should.not.be.null
        done()
      })
  })
  it('/interface/unlock', done => {
    request.post('/interface/unlock')
      .send({ id: itf.id })
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        expect(res.body.data.isOk).to.be.true
        done()
      })
  })
  it('/interface/remove', done => {
    request.get('/interface/remove')
      .query({ id: itf.id })
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        res.body.data.should.eq(1)
        done()
      })
  })
})
