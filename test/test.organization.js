/* global describe, it, before */
const app = require('../dist/scripts/app').default
const request = require('supertest').agent(app.listen())
const should = require('chai').should()
const Random = require('mockjs').Random
const { Organization } = require('../dist/models')
const { mockUsers, prepare, keys } = require('./helper')

describe('Organization', () => {
  let users = mockUsers()
  prepare(request, should, users)

  let organization
  before(done => {
    organization = {
      name: Random.ctitle(6) + Math.random(),
      description: Random.cparagraph(),
      logo: Random.url(),
      memberIds: users.slice(2).map(item => item.id),
      visibility: 1,
    }
    done()
  })
  let validOrganization = (organization) => {
    organization.should.be.a('object').have.all.keys(
      [...Object.keys(Organization.attributes), 'creator', 'owner', 'members']
    )
    let { creator, owner, members } = organization
    creator.should.be.a('object').have.all.keys(['id', 'fullname', 'email'])
    owner.should.be.a('object').have.all.keys(['id', 'fullname', 'email'])
    members.should.be.a('array').have.length.within(3, 3)
    members.forEach((user, index) => {
      owner.should.be.a('object').have.all.keys(['id', 'fullname', 'email'])
    })
  }
  let validPagination = (pagination) => {
    pagination.should.be.a('object').contain.all.keys(keys.pagination)
  }
  it('/organization/create', done => {
    request.post('/organization/create')
      .send(organization)
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        validOrganization(res.body.data)
        organization = res.body.data
        done()
      })
  })
  it('/organization/count', done => {
    request.get('/organization/count')
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        res.body.data.should.to.be.a('number').above(0)
        done()
      })
  })
  it('/organization/list', done => {
    request.get('/organization/list')
      .query({ name: organization.id, cursor: 1, limit: 1 })
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        let { data, pagination } = res.body
        data.should.be.a('array').have.lengthOf(1)
        data.forEach(item => {
          validOrganization(item)
        })
        validPagination(pagination)
        done()
      })
  })
  it('/organization/owned', done => {
    request.get('/organization/owned')
      .query({ name: organization.name })
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        let { data, pagination } = res.body
        data.should.be.a('array').have.length.within(1, 1)
        data.forEach(item => {
          validOrganization(item)
        })
        should.not.exist(pagination)
        done()
      })
  })
  it('/organization/get', done => {
    request.get('/organization/get')
      .query({ id: organization.id })
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        validOrganization(res.body.data)
        done()
      })
  })
  it('/organization/update', done => {
    request.post('/organization/update')
      .send(Object.assign({}, organization, { name: Random.ctitle(6) + Math.random() }))
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        res.body.data.should.eq(1)
        done()
      })
  })
  it('/organization/transfer', done => {
    request.post('/organization/transfer')
      .send({ id: organization.id, ownerId: users[1].id })
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        res.body.data.should.eq(1)
        done()
      })
  })
  it('/organization/remove', done => {
    request.get('/organization/remove')
      .query({ id: organization.id })
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        res.body.data.should.eq(1)
        done()
      })
  })
})
