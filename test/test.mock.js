/* global describe, it, before */
let app = require('../dist/scripts/app').default
let request = require('supertest').agent(app.listen())
let should = require('chai').should()
const { mockUsers, mockRepository, prepare } = require('./helper')

describe('Mock', () => {
  let users = mockUsers()
  let repository = mockRepository()
  prepare(request, should, users, repository)

  let interfaces
  before(done => {
    request.get('/interface/list')
      .query({ repositoryId: repository.id })
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        interfaces = res.body.data
        done()
      })
  })
  it('/app/plugin/:repository', done => {
    request.get(`/app/plugin/${repository.id}`)
      .expect('Content-Type', /javascript/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        done()
      })
  })
  it('/app/plugin/:repository,:repository', done => {
    request.get(`/app/plugin/${repository.id},${repository.id}`)
      .expect('Content-Type', /javascript/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        done()
      })
  })
  it('/app/mock/:repository/:method/:url', done => {
    request.get(`/app/mock/${interfaces[0].repositoryId}/${interfaces[0].method}/${interfaces[0].url}`)
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        done()
      })
  })
  it('/app/mock/template/:interfaceId', done => {
    request.get(`/app/mock/template/${interfaces[0].id}`)
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        done()
      })
  })
  it('/app/mock/data/:interfaceId', done => {
    request.get(`/app/mock/data/${interfaces[0].id}`)
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        done()
      })
  })
  // it('/app/get', done => {
  //   request.get('/app/get')
  //     .query({ user: 100000000, organization: 1, repository: 1, module: 1, interface: 1, property: 1 })
  //     .expect('Content-Type', /json/)
  //     .expect(200)
  //     .end((err, res) => {
  //       console.log(res.body.data)
  //       should.not.exist(err)
  //       let { user, organization, repository, property } = res.body.data
  //       let mod = res.body.data.module
  //       let itf = res.body.data.interface
  //       user.should.be.a('object')
  //       organization.should.be.a('object')
  //       repository.should.be.a('object')
  //       mod.should.be.a('object')
  //       itf.should.be.a('object')
  //       property.should.be.a('object')
  //       done()
  //     })
  // })
})
