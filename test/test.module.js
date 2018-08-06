/* global describe, it, before */
let app = require('../dist/scripts/app').default
let request = require('supertest').agent(app.listen())
let should = require('chai').should()
let Random = require('mockjs').Random
const { Module } = require('../dist/models')
const { mockUsers, mockRepository, prepare } = require('./helper')

describe('Module', () => {
  let users = mockUsers()
  let repository = mockRepository()
  prepare(request, should, users, repository)

  let mod = {}
  before(done => {
    mod = {
      name: Random.ctitle(6),
      description: Random.cparagraph(),
      repositoryId: repository.id
    }
    done()
  })
  let validModule = (mod) => {
    mod.should.be.a('object').have.all.keys(
      Object.keys(Module.attributes)
    )
    mod.creatorId.should.be.a('number')
    mod.repositoryId.should.be.a('number')
  }

  it('/module/create', done => {
    request.post('/module/create')
      .send(mod)
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        validModule(res.body.data)
        mod = res.body.data
        done()
      })
  })
  it('/module/count', done => {
    request.get('/module/count')
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        res.body.data.should.to.be.a('number').above(0)
        done()
      })
  })
  it('/module/list', done => {
    request.get('/module/list')
      .query({ repositoryId: repository.id })
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        let { data } = res.body
        data.should.be.a('array').have.length.within(1, 2)
        data.forEach(item => {
          validModule(item)
        })
        done()
      })
  })
  it('/module/get', done => {
    request.get('/module/get')
      .query({ id: mod.id })
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        validModule(res.body.data)
        done()
      })
  })
  it('/module/update', done => {
    request.post('/module/update')
      .send(Object.assign({}, mod, { name: Random.ctitle(6) + Math.random() }))
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        res.body.data.name.should.be.a('string')
        res.body.data.description.should.be.a('string')
        done()
      })
  })
  it('/module/remove', done => {
    request.get('/module/remove')
      .query({ id: mod.id })
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        res.body.data.should.eq(1)
        done()
      })
  })
})
