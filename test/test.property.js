/* global describe, it, before */
let app = require('../dist/scripts/app').default
let request = require('supertest').agent(app.listen())
let should = require('chai').should()
let Random = require('mockjs').Random
const { Property } = require('../dist/models')
const { mockUsers, mockRepository, prepare } = require('./helper')

describe('Property', () => {
  let users = mockUsers()
  let repository = mockRepository()
  prepare(request, should, users, repository)

  let mod = {}
  let itf = {}
  let property = {}
  before(done => {
    mod = repository.modules[0]
    itf = mod.interfaces[0]
    property = {
      scope: Random.pick(['request', 'response']),
      name: Random.word(6),
      type: Random.pick(['String', 'Number', 'Boolean', 'Object', 'Array', 'Function', 'RegExp']),
      rule: '',
      value: Random.pick(['@INT', '@FLOAT', '@TITLE', '@NAME']),
      description: Random.cparagraph(),
      parentId: -1,
      repositoryId: repository.id,
      moduleId: mod.id,
      interfaceId: itf.id
    }
    done()
  })
  let validProperty = (property) => {
    property.should.be.a('object').have.all.keys(
      Object.keys(Property.attributes)
    )
    property.creatorId.should.be.a('number')
    property.repositoryId.should.be.a('number')
    property.moduleId.should.be.a('number')
  }
  it('/property/create', done => {
    request.post('/property/create')
      .send(property)
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        validProperty(res.body.data)
        property = res.body.data
        done()
      })
  })

  it('/property/count', done => {
    request.get('/property/count')
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        res.body.data.should.to.be.a('number')
        done()
      })
  })
  it('/property/list', done => {
    request.get('/property/list')
      .query({ interfaceId: itf.id })
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        let { data } = res.body
        data.should.be.a('array').have.length.within(1, 15)
        data.forEach(item => {
          validProperty(item)
        })
        done()
      })
  })
  it('/property/get', done => {
    request.get('/property/get')
      .query({ id: property.id })
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        validProperty(res.body.data)
        done()
      })
  })
  it('/property/update', done => {
    request.post('/property/update')
      .send({ id: property.id, name: Random.word(6) })
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        res.body.data.should.eq(1)
        done()
      })
  })
  it('/property/remove', done => {
    request.get('/property/remove')
      .query({ id: property.id })
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        res.body.data.should.eq(1)
        done()
      })
  })
})
